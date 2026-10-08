import { userPatchSchema } from "@/lib/validations/user"
import { countLiveSystemAdmins, findUserById, softDeleteUser, toUserRecord, updateUser } from "@/lib/repositories/users"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { listOrganizations } from "@/lib/repositories/organizations"
import { AuthError, requireDashboardSession, requirePermission } from "@/lib/auth/require-auth"
import { isUserRemoved, resolveAccessStatus } from "@/lib/auth/access"
import { canGrantAccessGrants, hasPermission, isSystemAdmin } from "@/lib/auth/permissions"
import { authorizeUserPatch } from "@/lib/auth/user-patch-auth"
import { resolveMembership } from "@/lib/auth/membership"
import { canAssignRole, canGrantMemberships, canManageUser } from "@/lib/auth/team-access"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

const PENDING_REQUEST_ERROR = "This is a pending access request. Use Access requests to approve or reject it."

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const actor = await requireDashboardSession()
		const { id } = await context.params
		const body = userPatchSchema.parse(await readJson(request))
		const gate = authorizeUserPatch(actor, body)
		if (!gate.ok) {
			throw new AuthError(gate.error, gate.status)
		}
		const existing = await findUserById(id)
		if (!existing || isUserRemoved(existing)) {
			return fail("NOT_FOUND", "User not found.", 404)
		}
		if (resolveAccessStatus(existing.accessStatus) === "waitlisted") {
			return fail("FORBIDDEN", PENDING_REQUEST_ERROR, 403)
		}

		const target = await toUserRecord(existing)
		if (!canManageUser(actor, target)) {
			return fail("FORBIDDEN", "You cannot manage a user at or above your own level.", 403)
		}

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

		const touchesMembership = Boolean(body.role || body.membership)
		let membershipUpdate: {
			role?: string
			orgId?: string
			orgSlug?: string
			memberships?: typeof target.memberships
		} = {}

		if (touchesMembership) {
			const membership = await resolveMembership(nextRole, existing.orgSlug, body.membership)
			if ("error" in membership) {
				return fail("VALIDATION_ERROR", membership.error, 400)
			}

			const orgCatalog = await listOrganizations()
			if (!canGrantMemberships(actor, membership.memberships, orgCatalog)) {
				return fail("FORBIDDEN", "You cannot assign users outside your organizations.", 403)
			}

			membershipUpdate = {
				role: nextRole.slug,
				orgId: membership.org._id.toHexString(),
				orgSlug: membership.org.slug,
				memberships: membership.memberships,
			}
		}

		const user = await updateUser(id, {
			name: body.name,
			tags: body.tags,
			isActive: body.isActive,
			password: body.password,
			accessStatus: body.accessStatus,
			...membershipUpdate,
			extraGrants,
		})
		if (!user) {
			return fail("NOT_FOUND", "User not found.", 404)
		}
		return ok({ user })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function DELETE(_request: Request, context: RouteContext) {
	try {
		const actor = await requirePermission("users:delete")
		const { id } = await context.params
		if (actor.id === id) {
			return fail("FORBIDDEN", "You cannot remove your own account.", 403)
		}

		const existing = await findUserById(id)
		if (!existing || isUserRemoved(existing)) {
			return fail("NOT_FOUND", "User not found.", 404)
		}
		if (resolveAccessStatus(existing.accessStatus) === "waitlisted") {
			return fail("FORBIDDEN", PENDING_REQUEST_ERROR, 403)
		}

		const target = await toUserRecord(existing)
		if (!canManageUser(actor, target)) {
			return fail("FORBIDDEN", "You cannot remove a user at or above your own level.", 403)
		}

		if (isSystemAdmin(target) && (await countLiveSystemAdmins()) <= 1) {
			return fail("FORBIDDEN", "You cannot remove the last system admin.", 403)
		}

		const user = await softDeleteUser(id)
		if (!user) {
			return fail("NOT_FOUND", "User not found.", 404)
		}

		return ok({ user, removed: true })
	} catch (error) {
		return handleApiError(error)
	}
}
