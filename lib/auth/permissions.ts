import {
	ORGS_ALL_PERMISSION,
	PERMISSIONS,
	SYSTEM_ADMIN_PERMISSION,
	type Permission,
	type RoleRecord,
} from "@/types/domain"
import { GRANT_WILDCARD, hasAnyCapability, hasCapability, hasOrgWildcard, type AccessGrant } from "@/lib/auth/grants"
import { capabilityForPermission, permissionForCapability } from "@/lib/auth/compile-grants"
import { isPlatformPermission, isOrgBoundPermission } from "@/lib/auth/permission-scopes"

export const SUPER_ADMIN_ONLY_PERMISSIONS: readonly Permission[] = [
	SYSTEM_ADMIN_PERMISSION,
	ORGS_ALL_PERMISSION,
	"roles:write",
]

export const PERMISSION_META: Record<Permission, { name: string; group: string }> = {
	"dashboard:read": { name: "View dashboard", group: "dashboard" },
	"leads:read": { name: "View leads", group: "leads" },
	"leads:write": { name: "Edit leads", group: "leads" },
	"leads:delete": { name: "Delete leads", group: "leads" },
	"machines:read": { name: "View machines", group: "fleet" },
	"machines:write": { name: "Edit machines", group: "fleet" },
	"locations:read": { name: "View locations", group: "fleet" },
	"locations:write": { name: "Edit locations", group: "fleet" },
	"inventory:read": { name: "View inventory", group: "fleet" },
	"inventory:write": { name: "Edit inventory", group: "fleet" },
	"revenue:read": { name: "View revenue", group: "revenue" },
	"users:read": { name: "View team", group: "team" },
	"users:write": { name: "Invite and edit team", group: "team" },
	"users:delete": { name: "Remove teammates", group: "team" },
	"users:grant": { name: "Grant extra permissions", group: "team" },
	"roles:read": { name: "View roles", group: "access" },
	"roles:write": { name: "Reassign role permissions", group: "access" },
	"settings:read": { name: "View settings", group: "settings" },
	"settings:write": { name: "Edit settings", group: "settings" },
	"cms:read": { name: "View blog CMS", group: "cms" },
	"cms:write": { name: "Edit blog CMS", group: "cms" },
	"orgs:all": { name: "All organizations", group: "access" },
	"system:admin": { name: "System administrator", group: "access" },
	"developer:read": { name: "View developer diagnostics", group: "developer" },
}

export const PERMISSION_GROUP_LABELS: Record<string, string> = {
	dashboard: "Dashboard",
	leads: "Leads",
	fleet: "Fleet",
	revenue: "Revenue",
	team: "Team",
	access: "Access",
	settings: "Settings",
	cms: "CMS",
	developer: "Developer",
}

export const CUSTOM_ROLE_SLUG = "custom"

export function isPermission(value: unknown): value is Permission {
	return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value)
}

export function normalizePermissions(values: readonly string[] | null | undefined): Permission[] {
	return [...new Set((values ?? []).filter(isPermission))]
}

export function resolvePermissions(
	role: Pick<RoleRecord, "permissions"> | null | undefined,
	extraPermissions: readonly string[] | null | undefined,
): Permission[] {
	return normalizePermissions([...(role?.permissions ?? []), ...(extraPermissions ?? [])])
}

export function hasPermission(
	user: {
		permissions?: readonly string[]
		extraPermissions?: readonly string[]
		grants?: import("@/lib/auth/grants").AccessGrant[]
		activeOrgSlug?: string
		orgSlug?: string
		accessibleOrgs?: { slug: string; tags: string[] }[]
		canAccessAdmin?: boolean
	} | null | undefined,
	permission: Permission,
): boolean {
	if (
		user?.permissions?.includes(SYSTEM_ADMIN_PERMISSION) ||
		user?.extraPermissions?.includes(SYSTEM_ADMIN_PERMISSION) ||
		hasAnyCapability(user?.grants, "system", "admin")
	) {
		return true
	}
	if (user?.grants?.length) {
		if (permission === ORGS_ALL_PERMISSION) {
			return hasOrgWildcard(user.grants)
		}
		const capability = capabilityForPermission(permission)
		if (!capability) {
			return Boolean(user.permissions?.includes(permission))
		}
		if (isPlatformPermission(permission)) {
			return hasAnyCapability(user.grants, capability.resource, capability.action)
		}
		if (hasOrgWildcard(user.grants) || (user.canAccessAdmin && !user.activeOrgSlug)) {
			return hasAnyCapability(user.grants, capability.resource, capability.action)
		}
		const org = user.activeOrgSlug || user.orgSlug
		const orgTags = user.accessibleOrgs?.find((item) => item.slug === org)?.tags
		return hasCapability(user.grants, {
			resource: capability.resource,
			action: capability.action,
			org,
			orgTags,
		})
	}
	return Boolean(user?.permissions?.includes(permission))
}

export function hasAnyPermission(
	user: { permissions?: readonly string[] } | null | undefined,
	permissions: readonly Permission[],
): boolean {
	return permissions.some((permission) => hasPermission(user, permission))
}

export function hasAllOrganizations(user: {
	permissions?: readonly string[]
	extraPermissions?: readonly string[]
	grants?: import("@/lib/auth/grants").AccessGrant[]
} | null | undefined): boolean {
	if (hasOrgWildcard(user?.grants)) {
		return true
	}
	return (
		hasPermission(user, ORGS_ALL_PERMISSION) ||
		Boolean(user?.extraPermissions?.includes(ORGS_ALL_PERMISSION))
	)
}

export function isSystemAdmin(user: {
	permissions?: readonly string[]
	extraPermissions?: readonly string[]
	grants?: import("@/lib/auth/grants").AccessGrant[]
} | null | undefined): boolean {
	return (
		hasPermission(user, SYSTEM_ADMIN_PERMISSION) ||
		Boolean(user?.extraPermissions?.includes(SYSTEM_ADMIN_PERMISSION))
	)
}

export function roleHasPermission(
	role: Pick<RoleRecord, "permissions"> | null | undefined,
	permission: Permission,
): boolean {
	return Boolean(role?.permissions.includes(permission))
}

export function roleHasAllOrganizations(role: Pick<RoleRecord, "permissions"> | null | undefined): boolean {
	return roleHasPermission(role, ORGS_ALL_PERMISSION)
}

export function isReservedPermission(permission: Permission): boolean {
	return SUPER_ADMIN_ONLY_PERMISSIONS.includes(permission)
}

export function isOwnerRole(role: Pick<RoleRecord, "permissions"> & { slug?: string } | null | undefined): boolean {
	return roleHasPermission(role, SYSTEM_ADMIN_PERMISSION) || role?.slug === "super_admin"
}

export function grantablePermissions(
	actor: { permissions?: readonly string[] } | null | undefined,
): Permission[] {
	return normalizePermissions(actor?.permissions).filter((permission) => !isReservedPermission(permission))
}

export function canGrantAccessGrants(
	actor: {
		permissions?: readonly string[]
		grants?: AccessGrant[]
		accessibleOrgs?: { slug: string; tags: string[] }[]
	} | null | undefined,
	grants: readonly AccessGrant[],
): boolean {
	if (isSystemAdmin(actor)) {
		return true
	}
	return grants.every((grant) => canGrantAccessGrant(actor, grant))
}

export function canGrantAccessGrant(
	actor: {
		permissions?: readonly string[]
		grants?: AccessGrant[]
		accessibleOrgs?: { slug: string; tags: string[] }[]
	} | null | undefined,
	grant: AccessGrant,
): boolean {
	if (isSystemAdmin(actor)) {
		return true
	}
	const permission = permissionForCapability(grant.resource, grant.action)
	if (!permission || isReservedPermission(permission)) {
		return false
	}
	if (!grantablePermissions(actor).includes(permission)) {
		return false
	}
	if (!actor?.grants?.length) {
		return Boolean(actor?.permissions?.includes(permission))
	}
	if (isPlatformPermission(permission) || !isOrgBoundPermission(permission)) {
		return hasAnyCapability(actor.grants, grant.resource, grant.action)
	}
	if (hasOrgWildcard(actor.grants) || grant.org === GRANT_WILDCARD) {
		return hasAnyCapability(actor.grants, grant.resource, grant.action)
	}
	const orgTags = grant.org
		? actor.accessibleOrgs?.find((item) => item.slug === grant.org)?.tags
		: grant.orgTag
			? [grant.orgTag]
			: undefined
	return hasCapability(actor.grants, {
		resource: grant.resource,
		action: grant.action,
		org: grant.org,
		orgTags,
	})
}

export function canGrantPermissions(
	actor: { permissions?: readonly string[] } | null | undefined,
	requested: readonly Permission[],
): boolean {
	const allowed = new Set(grantablePermissions(actor))
	return requested.every((permission) => allowed.has(permission))
}

export function sanitizeRolePermissions(
	role: Pick<RoleRecord, "permissions"> & { slug?: string },
	permissions: readonly string[],
): Permission[] {
	const next = normalizePermissions(permissions)
	if (isOwnerRole(role)) {
		return normalizePermissions([...next, ...SUPER_ADMIN_ONLY_PERMISSIONS])
	}
	return next.filter((permission) => !isReservedPermission(permission))
}
