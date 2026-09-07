import { userPatchSchema } from "@/lib/validations/user"
import { findUserById, toUserRecord, updateUser } from "@/lib/repositories/users"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { requirePermission } from "@/lib/auth/require-auth"
import { isUserRemoved } from "@/lib/auth/access"
import { canGrantAccessGrants, hasPermission, isSystemAdmin } from "@/lib/auth/permissions"
import { issueInvite } from "@/lib/auth/invite"
import { resolveMembership } from "@/lib/auth/membership"
import { permissionsFromGrants } from "@/lib/auth/compile-grants"
import {
	canAssignRole,
	canGrantResourceAccess,
	canManageUser,
} from "@/lib/auth/resource-access"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const actor = await requirePermission("users:write")
		const { id } = await context.params
		const existing = await findUserById(id)
		if (!existing || isUserRemoved(existing)) {
			return fail("NOT_FOUND", "User not found.", 404)
		}

		const target = await toUserRecord(existing)
		if (!canManageUser(actor, target)) {
			return fail("FORBIDDEN", "You cannot manage a user at or above your own level.", 403)
		}

		const raw = await readJson(request).catch(() => ({}))
		const body = userPatchSchema.parse(raw && typeof raw === "object" ? raw : {})
		const nextRole = body.role ? await findRoleBySlug(body.role) : await findRoleBySlug(existing.role)
		if (!nextRole) {
			return fail("NOT_FOUND", "Role not found.", 404)
		}
		if (body.role && !canAssignRole(actor, nextRole)) {
			return fail("FORBIDDEN", "You cannot assign a role at or above your own level.", 403)
		}

		const extraGrants = body.extraGrants
		if (extraGrants !== undefined) {
			if (!hasPermission(actor, "users:grant") && !isSystemAdmin(actor)) {
				return fail("FORBIDDEN", "You cannot grant extra permissions.", 403)
			}
			if (!canGrantAccessGrants(actor, extraGrants)) {
				return fail("FORBIDDEN", "You can only grant access you already have.", 403)
			}
		}

		const membership = await resolveMembership(
			nextRole,
			body.resourceAccess,
			existing.orgSlug,
			body.membership,
		)
		if ("error" in membership) {
			return fail("VALIDATION_ERROR", membership.error, 400)
		}

		if (membership.memberships.length > 0 || membership.resourceAccess.mode === "all") {
			const { allLocations, allMachines } = await loadVisibleFleet(actor)
			if (!canGrantResourceAccess(actor, membership.resourceAccess, { locations: allLocations, machines: allMachines })) {
				return fail("FORBIDDEN", "You cannot grant broader resource access than you have.", 403)
			}
		}

		await updateUser(id, {
			name: body.name,
			role: nextRole.slug,
			resourceAccess: membership.resourceAccess,
			memberships: membership.memberships,
			orgId: membership.org._id.toHexString(),
			orgSlug: membership.org.slug,
			organization: membership.org.name,
			extraGrants,
			extraPermissions: extraGrants !== undefined ? permissionsFromGrants(extraGrants) : undefined,
			accessStatus: "pending_invite",
		})

		const invite = await issueInvite(id)
		const user = await findUserById(id)
		return ok({
			user: user ? await toUserRecord(user) : target,
			inviteSent: invite.sent,
			inviteExpiresAt: invite.expiresAt.toISOString(),
		})
	} catch (error) {
		return handleApiError(error)
	}
}
