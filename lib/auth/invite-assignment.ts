import { CUSTOM_ROLE_SLUG } from "@/lib/auth/permissions"
import type { Permission, RoleRecord } from "@/types/domain"

export function samePermissionSet(left: readonly Permission[], right: readonly Permission[]): boolean {
	if (left.length !== right.length) {
		return false
	}
	const set = new Set(left)
	return right.every((permission) => set.has(permission))
}

export function resolveInviteAssignment(
	roleSlug: string,
	selected: readonly Permission[],
	roles: readonly RoleRecord[],
): { role: string; extraPermissions: Permission[] } {
	const selectedPermissions = [...new Set(selected)]
	const role = roles.find((item) => item.slug === roleSlug && item.slug !== CUSTOM_ROLE_SLUG)
	if (!role) {
		return { role: CUSTOM_ROLE_SLUG, extraPermissions: selectedPermissions }
	}
	if (samePermissionSet(role.permissions, selectedPermissions)) {
		return { role: role.slug, extraPermissions: [] }
	}
	if (role.permissions.every((permission) => selectedPermissions.includes(permission))) {
		return {
			role: role.slug,
			extraPermissions: selectedPermissions.filter((permission) => !role.permissions.includes(permission)),
		}
	}
	return { role: CUSTOM_ROLE_SLUG, extraPermissions: selectedPermissions }
}
