import { userCreateSchema } from "@/lib/validations/user"
import { createUser, findUserByEmail, listUsers, toUserRecord, updateUser } from "@/lib/repositories/users"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { requirePermission } from "@/lib/auth/require-auth"
import { isUserRemoved, resolveAccessStatus } from "@/lib/auth/access"
import { canGrantAccessGrants, canGrantPermissions, hasPermission } from "@/lib/auth/permissions"
import { issueInvite } from "@/lib/auth/invite"
import { resolveMembership } from "@/lib/auth/membership"
import { permissionsFromGrants } from "@/lib/auth/compile-grants"
import {
	canAssignRole,
	canGrantResourceAccess,
	canManageUser,
	canSeeTeamMember,
} from "@/lib/auth/resource-access"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
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
		const extraPermissions =
			extraGrants.length > 0 ? permissionsFromGrants(extraGrants) : (body.extraPermissions ?? [])
		if (extraGrants.length > 0 || extraPermissions.length > 0) {
			if (!hasPermission(actor, "users:grant")) {
				return fail("FORBIDDEN", "You cannot grant extra permissions.", 403)
			}
			if (extraGrants.length > 0 && !canGrantAccessGrants(actor, extraGrants)) {
				return fail("FORBIDDEN", "You can only grant access you already have.", 403)
			}
			if (extraGrants.length === 0 && !canGrantPermissions(actor, extraPermissions)) {
				return fail("FORBIDDEN", "You can only grant permissions you already have.", 403)
			}
		}

		const membership = await resolveMembership(role, body.resourceAccess, body.orgSlug, body.membership)
		if ("error" in membership) {
			return fail("VALIDATION_ERROR", membership.error, 400)
		}

		if (membership.memberships.length > 0 || membership.resourceAccess.mode === "all") {
			const { allLocations, allMachines } = await loadVisibleFleet(actor)
			if (!canGrantResourceAccess(actor, membership.resourceAccess, { locations: allLocations, machines: allMachines })) {
				return fail("FORBIDDEN", "You cannot grant broader resource access than you have.", 403)
			}
		}

		const existing = await findUserByEmail(body.email)
		let userId: string

		const assignment = {
			name: body.name,
			role: role.slug,
			orgId: membership.org._id.toHexString(),
			orgSlug: membership.org.slug,
			organization: body.organization ?? membership.org.name,
			resourceAccess: membership.resourceAccess,
			memberships: membership.memberships,
			extraPermissions,
			extraGrants,
			accessStatus: "pending_invite" as const,
			deletedAt: null,
			isActive: true,
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

			const updated = await updateUser(existing._id.toHexString(), {
				...assignment,
				tags: body.tags ?? existing.tags,
			})
			if (!updated) {
				return fail("SERVER_ERROR", "Could not grant access to that account.", 500)
			}
			userId = updated.id
		} else if (existing && isUserRemoved(existing)) {
			const updated = await updateUser(existing._id.toHexString(), {
				...assignment,
				tags: body.tags ?? existing.tags,
				emailVerified: false,
				passwordReady: false,
				inviteAcceptedAt: null,
			})
			if (!updated) {
				return fail("SERVER_ERROR", "Could not restore that account.", 500)
			}
			userId = updated.id
		} else {
			const created = await createUser({
				...assignment,
				email: body.email,
				tags: body.tags ?? [],
				emailVerified: false,
				passwordReady: false,
			})
			userId = created.id
		}

		const invite = await issueInvite(userId)
		const user = await findUserByEmail(body.email)
		return ok({
			user: user && !isUserRemoved(user) ? await toUserRecord(user) : undefined,
			inviteSent: invite.sent,
			inviteExpiresAt: invite.expiresAt.toISOString(),
		}, existing ? 200 : 201)
	} catch (error) {
		return handleApiError(error)
	}
}
