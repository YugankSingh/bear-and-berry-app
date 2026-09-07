import { isVendforgeLabs } from "@/lib/auth/scope"
import { hasPermission, isSystemAdmin } from "@/lib/auth/permissions"
import { ADMIN_NAV, ORG_NAV, type WorkspaceKind } from "@/lib/auth/workspace"
import type { Permission, SessionUser } from "@/types/domain"

export function canAccessCms(user: SessionUser): boolean {
	if (!hasPermission(user, "cms:read")) {
		return false
	}
	return isSystemAdmin(user) || isVendforgeLabs(user)
}

export { hasAnyPermission, hasPermission } from "@/lib/auth/permissions"

export function permissionsForUser(user: Pick<SessionUser, "permissions">): readonly Permission[] {
	return user.permissions
}

export function assertPermission(
	user: Pick<SessionUser, "permissions" | "grants">,
	permission: Permission,
): void {
	if (!hasPermission(user, permission)) {
		throw new RbacError(permission)
	}
}

export class RbacError extends Error {
	readonly permission: Permission

	constructor(permission: Permission) {
		super(`Missing permission: ${permission}`)
		this.name = "RbacError"
		this.permission = permission
	}
}

export const NAV_ITEMS = ORG_NAV

export type NavItem = (typeof ORG_NAV)[number] | (typeof ADMIN_NAV)[number]

export function navItemsFor(workspace: WorkspaceKind): readonly NavItem[] {
	return workspace === "admin" ? ADMIN_NAV : ORG_NAV
}

export function visibleNavItems(user: SessionUser, workspace: WorkspaceKind = "org"): readonly NavItem[] {
	return navItemsFor(workspace).filter((item) => {
		if (item.href.includes("/cms")) {
			return canAccessCms(user)
		}
		if (item.permission === "orgs:all") {
			return user.canAccessAdmin && (hasPermission(user, "orgs:all") || isSystemAdmin(user))
		}
		return hasPermission(user, item.permission)
	})
}
