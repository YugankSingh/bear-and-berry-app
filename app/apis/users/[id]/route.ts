import { userPatchSchema } from "@/lib/validations/user"
import { countLiveSystemAdmins, findUserById, softDeleteUser, toUserRecord, updateUser } from "@/lib/repositories/users"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { AuthError, requireDashboardSession, requirePermission } from "@/lib/auth/require-auth"
import { isUserRemoved } from "@/lib/auth/access"
import {
	canGrantAccessGrants,
	canGrantPermissions,
	hasPermission,
	isSystemAdmin,
} from "@/lib/auth/permissions"
import { resolveMembership } from "@/lib/auth/membership"
import { permissionsFromGrants } from "@/lib/auth/compile-grants"
import {
	canAssignRole,
	canGrantResourceAccess,
	canManageUser,
	resolveResourceAccess,
} from "@/lib/auth/resource-access"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const actor = await requireDashboardSession()
		const { id } = await context.params
		const body = userPatchSchema.parse(await readJson(request))
		const extraOnly =
			(body.extraPermissions !== undefined || body.extraGrants !== undefined) &&
			body.role === undefined &&
			body.resourceAccess === undefined &&
			body.membership === undefined &&
			body.name === undefined &&
			body.organization === undefined &&
			body.tags === undefined &&
			body.isActive === undefined &&
			body.accessStatus === undefined
		if (extraOnly) {
			if (!hasPermission(actor, "users:grant") && !isSystemAdmin(actor)) {
				throw new AuthError("You cannot grant extra permissions.", 403)
			}
		} else if (!hasPermission(actor, "users:write")) {
			throw new AuthError("You do not have access to this resource.", 403)
		}
		const existing = await findUserById(id)
		if (!existing || isUserRemoved(existing)) {
			return fail("NOT_FOUND", "User not found.", 404)
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
		const extraPermissions =
			extraGrants !== undefined
				? permissionsFromGrants(extraGrants)
				: body.extraPermissions
		if (extraPermissions && !canGrantPermissions(actor, extraPermissions) && extraGrants === undefined) {
			return fail("FORBIDDEN", "You can only grant permissions you already have.", 403)
		}
		if (extraGrants !== undefined) {
			if (!hasPermission(actor, "users:grant") && !isSystemAdmin(actor)) {
				return fail("FORBIDDEN", "You cannot grant extra permissions.", 403)
			}
			if (!canGrantAccessGrants(actor, extraGrants)) {
				return fail("FORBIDDEN", "You can only grant access you already have.", 403)
			}
		}

		const touchesMembership = Boolean(body.role || body.resourceAccess || body.membership)
		let membershipUpdate: {
			role?: string
			resourceAccess?: ReturnType<typeof resolveResourceAccess>
			orgId?: string
			orgSlug?: string
			organization?: string
			memberships?: typeof target.memberships
		} = {}

		if (touchesMembership) {
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

			membershipUpdate = {
				role: nextRole.slug,
				resourceAccess: membership.resourceAccess,
				orgId: membership.org._id.toHexString(),
				orgSlug: membership.org.slug,
				organization: body.organization ?? membership.org.name,
				memberships: membership.memberships,
			}
		}

		const user = await updateUser(id, {
			name: body.name,
			organization: body.organization,
			tags: body.tags,
			isActive: body.isActive,
			password: body.password,
			accessStatus: body.accessStatus,
			...membershipUpdate,
			extraPermissions,
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
