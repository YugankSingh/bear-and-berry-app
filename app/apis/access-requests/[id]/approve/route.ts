import { userPatchSchema } from "@/lib/validations/user"
import { findUserById } from "@/lib/repositories/users"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { listOrganizations } from "@/lib/repositories/organizations"
import { requirePermission } from "@/lib/auth/require-auth"
import { isUserRemoved, resolveAccessStatus } from "@/lib/auth/access"
import { canGrantAccessGrants, hasPermission, isSystemAdmin } from "@/lib/auth/permissions"
import { issueInvite } from "@/lib/auth/invite"
import { resolveMembership } from "@/lib/auth/membership"
import { canAssignRole, canGrantMemberships } from "@/lib/auth/team-access"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const actor = await requirePermission("signups:approve")
		const { id } = await context.params
		const existing = await findUserById(id)
		if (!existing || isUserRemoved(existing) || resolveAccessStatus(existing.accessStatus) !== "waitlisted") {
			return fail("NOT_FOUND", "Access request not found.", 404)
		}

		const body = userPatchSchema.parse(await readJson(request))

		const extraGrants = body.extraGrants ?? []
		if (extraGrants.length > 0) {
			if (!hasPermission(actor, "users:grant") && !isSystemAdmin(actor)) {
				return fail("FORBIDDEN", "You cannot grant extra permissions.", 403)
			}
			if (!canGrantAccessGrants(actor, extraGrants)) {
				return fail("FORBIDDEN", "You can only grant access you already have.", 403)
			}
		}

		// No role: approve the account with nothing attached; permissions are added later from Team.
		if (!body.role) {
			const invite = await issueInvite(id, {
				email: existing.email,
				name: body.name ?? existing.name,
				patch: {
					name: body.name,
					role: "",
					memberships: [],
					orgId: null,
					orgSlug: "",
					extraGrants,
				},
			})
			return ok({
				user: invite.user,
				inviteSent: true,
				inviteExpiresAt: invite.expiresAt.toISOString(),
			})
		}

		const role = await findRoleBySlug(body.role)
		if (!role) {
			return fail("NOT_FOUND", "Role not found.", 404)
		}
		if (!canAssignRole(actor, role)) {
			return fail("FORBIDDEN", "You cannot assign a role at or above your own level.", 403)
		}

		const membership = await resolveMembership(role, undefined, body.membership)
		if ("error" in membership) {
			return fail("VALIDATION_ERROR", membership.error, 400)
		}
		const orgCatalog = await listOrganizations()
		if (!canGrantMemberships(actor, membership.memberships, orgCatalog)) {
			return fail("FORBIDDEN", "You cannot assign users outside your organizations.", 403)
		}

		const invite = await issueInvite(id, {
			email: existing.email,
			name: body.name ?? existing.name,
			patch: {
				name: body.name,
				role: role.slug,
				memberships: membership.memberships,
				orgId: membership.org._id.toHexString(),
				orgSlug: membership.org.slug,
				extraGrants,
			},
		})

		return ok({
			user: invite.user,
			inviteSent: true,
			inviteExpiresAt: invite.expiresAt.toISOString(),
		})
	} catch (error) {
		return handleApiError(error)
	}
}
