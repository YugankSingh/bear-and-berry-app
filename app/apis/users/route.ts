import { userCreateSchema } from "@/lib/validations/user"
import { createUser, findUserByEmail, listUsers, toUserRecord } from "@/lib/repositories/users"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { listOrganizations } from "@/lib/repositories/organizations"
import { requirePermission } from "@/lib/auth/require-auth"
import { isUserRemoved, resolveAccessStatus } from "@/lib/auth/access"
import { canGrantAccessGrants, hasPermission } from "@/lib/auth/permissions"
import { issueInvite, scheduleInviteEmail } from "@/lib/auth/invite"
import { createInviteToken } from "@/lib/auth/tokens"
import { resolveMembership } from "@/lib/auth/membership"
import { canAssignRole, canManageUser, canSeeTeamMember, canGrantMemberships } from "@/lib/auth/team-access"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		const actor = await requirePermission("users:read")
		const users = await listUsers()
		const visible = users.filter((user) => canSeeTeamMember(actor, user))
		return ok({ users: visible })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const actor = await requirePermission("users:write")
		const body = userCreateSchema.parse(await readJson(request))
		const role = await findRoleBySlug(body.role)
		if (!role) {
			return fail("NOT_FOUND", "Role not found.", 404)
		}

		if (!canAssignRole(actor, role)) {
			return fail("FORBIDDEN", "You cannot assign a role at or above your own level.", 403)
		}

		const extraGrants = body.extraGrants ?? []
		if (extraGrants.length > 0) {
			if (!hasPermission(actor, "users:grant")) {
				return fail("FORBIDDEN", "You cannot grant extra permissions.", 403)
			}
			if (!canGrantAccessGrants(actor, extraGrants)) {
				return fail("FORBIDDEN", "You can only grant access you already have.", 403)
			}
		}

		const membership = await resolveMembership(role, body.orgSlug, body.membership)
		if ("error" in membership) {
			return fail("VALIDATION_ERROR", membership.error, 400)
		}

		const orgCatalog = await listOrganizations()
		if (!canGrantMemberships(actor, membership.memberships, orgCatalog)) {
			return fail("FORBIDDEN", "You cannot assign users outside your organizations.", 403)
		}

		const existing = await findUserByEmail(body.email)

		const assignment = {
			name: body.name,
			role: role.slug,
			orgId: membership.org._id.toHexString(),
			orgSlug: membership.org.slug,
			memberships: membership.memberships,
			extraGrants,
			accessStatus: "pending_invite" as const,
		}

		if (existing && !isUserRemoved(existing)) {
			const status = resolveAccessStatus(existing.accessStatus)
			const existingRecord = await toUserRecord(existing)
			if (status === "invited") {
				return fail("CONFLICT", "A user with that email already exists.", 409)
			}
			if (!canManageUser(actor, existingRecord)) {
				return fail("FORBIDDEN", "You cannot manage that account.", 403)
			}

			const invite = await issueInvite(existing._id.toHexString(), {
				email: body.email,
				name: body.name,
				patch: {
					...assignment,
					tags: body.tags ?? existing.tags,
				},
			})
			return ok({
				user: invite.user,
				inviteSent: true,
				inviteExpiresAt: invite.expiresAt.toISOString(),
			})
		}

		if (existing && isUserRemoved(existing)) {
			const invite = await issueInvite(existing._id.toHexString(), {
				email: body.email,
				name: body.name,
				patch: {
					...assignment,
					tags: body.tags ?? existing.tags,
					emailVerified: false,
					passwordReady: false,
					inviteAcceptedAt: null,
					deletedAt: null,
					isActive: true,
				},
			})
			return ok({
				user: invite.user,
				inviteSent: true,
				inviteExpiresAt: invite.expiresAt.toISOString(),
			})
		}

		const invite = createInviteToken()
		const created = await createUser({
			...assignment,
			email: body.email,
			tags: body.tags ?? [],
			emailVerified: false,
			passwordReady: false,
			inviteTokenHash: invite.tokenHash,
			inviteExpiresAt: invite.expiresAt,
		})
		scheduleInviteEmail({
			to: body.email,
			name: body.name,
			token: invite.token,
		})
		return ok(
			{
				user: created,
				inviteSent: true,
				inviteExpiresAt: invite.expiresAt.toISOString(),
			},
			201,
		)
	} catch (error) {
		return handleApiError(error)
	}
}
