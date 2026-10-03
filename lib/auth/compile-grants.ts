import {
	ORGS_ALL_PERMISSION,
	SYSTEM_ADMIN_PERMISSION,
	type Permission,
	type RoleRecord,
} from "@/types/domain"
import {
	GRANT_WILDCARD,
	fillRequiredWildcards,
	parseGrants,
	stringifyGrants,
	type AccessGrant,
	type AccessibleOrg,
	type GrantAction,
	type GrantResource,
	type OrgMembership,
	RESOURCE_DIMENSIONS,
	normalizeMemberships,
} from "@/lib/auth/grants"
import { isOrgBoundPermission } from "@/lib/auth/permission-scopes"

const PERMISSION_CAPABILITY: Record<Permission, { resource: GrantResource; action: GrantAction } | null> = {
	"dashboard:read": { resource: "dashboard", action: "view" },
	"leads:read": { resource: "leads", action: "view" },
	"leads:write": { resource: "leads", action: "edit" },
	"leads:delete": { resource: "leads", action: "delete" },
	"leads:notify": { resource: "leads", action: "grant" },
	"machines:read": { resource: "machines", action: "view" },
	"machines:write": { resource: "machines", action: "edit" },
	"locations:read": { resource: "locations", action: "view" },
	"locations:write": { resource: "locations", action: "edit" },
	"inventory:read": { resource: "inventory", action: "view" },
	"inventory:write": { resource: "inventory", action: "edit" },
	"revenue:read": { resource: "revenue", action: "view" },
	"users:read": { resource: "users", action: "view" },
	"users:write": { resource: "users", action: "edit" },
	"users:delete": { resource: "users", action: "delete" },
	"users:grant": { resource: "users", action: "grant" },
	"roles:read": { resource: "roles", action: "view" },
	"roles:write": { resource: "roles", action: "edit" },
	"settings:read": { resource: "settings", action: "view" },
	"settings:write": { resource: "settings", action: "edit" },
	"cms:read": { resource: "cms", action: "view" },
	"cms:write": { resource: "cms", action: "edit" },
	"orgs:all": null,
	"system:admin": { resource: "system", action: "admin" },
	"developer:read": { resource: "developer", action: "view" },
}

const ACTION_TO_PERMISSION: Partial<Record<GrantResource, Partial<Record<GrantAction, Permission>>>> = {
	dashboard: { view: "dashboard:read" },
	leads: { view: "leads:read", edit: "leads:write", delete: "leads:delete", grant: "leads:notify" },
	machines: { view: "machines:read", edit: "machines:write" },
	locations: { view: "locations:read", edit: "locations:write" },
	inventory: { view: "inventory:read", edit: "inventory:write" },
	revenue: { view: "revenue:read" },
	users: { view: "users:read", edit: "users:write", delete: "users:delete", grant: "users:grant" },
	roles: { view: "roles:read", edit: "roles:write" },
	settings: { view: "settings:read", edit: "settings:write" },
	cms: { view: "cms:read", edit: "cms:write" },
	developer: { view: "developer:read" },
	system: { admin: SYSTEM_ADMIN_PERMISSION },
	orgs: { view: ORGS_ALL_PERMISSION },
}

export type CompileGrantInput = {
	role?: Pick<RoleRecord, "slug" | "permissions"> | null
	memberships: readonly OrgMembership[]
	extraGrants?: readonly AccessGrant[]
}

export function capabilityForPermission(permission: Permission): {
	resource: GrantResource
	action: GrantAction
} | null {
	return PERMISSION_CAPABILITY[permission]
}

export function permissionForCapability(resource: GrantResource, action: GrantAction): Permission | null {
	return ACTION_TO_PERMISSION[resource]?.[action] ?? null
}

export function permissionsFromGrants(grants: readonly AccessGrant[]): Permission[] {
	const keys = new Set<Permission>()
	for (const grant of grants) {
		const permission = permissionForCapability(grant.resource, grant.action)
		if (permission) {
			keys.add(permission)
		}
		if (grant.resource === "orgs" && grant.action === "view" && grant.org === GRANT_WILDCARD && !grant.orgTag) {
			keys.add(ORGS_ALL_PERMISSION)
		}
		if (grant.resource === "system" && grant.action === "admin") {
			keys.add(SYSTEM_ADMIN_PERMISSION)
			keys.add(ORGS_ALL_PERMISSION)
		}
	}
	return [...keys]
}

export function compileGrants(input: CompileGrantInput): AccessGrant[] {
	const rolePermissions = uniquePermissions(input.role?.permissions ?? [])
	const roleSlug = input.role?.slug ?? "viewer"
	const memberships = normalizeMemberships(input.memberships)
	const extraGrants = input.extraGrants ?? []
	const permissions = uniquePermissions([...rolePermissions, ...permissionsFromGrants(extraGrants)])

	const orgBound = rolePermissions.filter(isOrgBoundPermission)
	const platform = rolePermissions.filter((permission) => !isOrgBoundPermission(permission))
	const allOrganizations =
		rolePermissions.includes(ORGS_ALL_PERMISSION) ||
		rolePermissions.includes(SYSTEM_ADMIN_PERMISSION) ||
		memberships.some((membership) => membership.org === GRANT_WILDCARD)
	const orgMemberships = allOrganizations
		? normalizeMemberships([{ org: GRANT_WILDCARD, orgTag: null, role: roleSlug }])
		: memberships

	const grants: AccessGrant[] = []
	for (const membership of orgMemberships) {
		for (const permission of orgBound) {
			grants.push(...grantsForOrgPermission(permission, membership))
		}
	}
	for (const permission of platform) {
		grants.push(...grantsForPlatformPermission(permission))
	}
	for (const extra of extraGrants) {
		grants.push(fillRequiredWildcards(extra))
	}
	return parseGrants(stringifyGrants(grants))
}

export function compileGrantKeys(input: CompileGrantInput): string[] {
	return stringifyGrants(compileGrants(input))
}

export function resolveAccessibleOrgs(
	grants: readonly AccessGrant[],
	memberships: readonly OrgMembership[],
	catalog: readonly AccessibleOrg[],
): AccessibleOrg[] {
	const fromWildcard =
		memberships.some((membership) => membership.org === GRANT_WILDCARD) ||
		grants.some((grant) => grant.org === GRANT_WILDCARD && !grant.orgTag)
	if (fromWildcard) {
		return [...catalog]
	}

	return catalog.filter((org) => {
		if (memberships.some((membership) => membershipCovers(membership, org))) {
			return true
		}
		return grants.some((grant) => {
			if (grant.org && grant.org === org.slug) {
				return !grant.orgTag || org.tags.includes(grant.orgTag)
			}
			if (grant.orgTag) {
				return org.tags.includes(grant.orgTag)
			}
			return false
		})
	})
}

function membershipCovers(membership: OrgMembership, org: AccessibleOrg): boolean {
	if (membership.org === GRANT_WILDCARD) {
		return true
	}
	if (membership.org && membership.org === org.slug) {
		return !membership.orgTag || org.tags.includes(membership.orgTag)
	}
	if (membership.orgTag) {
		return org.tags.includes(membership.orgTag)
	}
	return false
}

function grantsForPlatformPermission(permission: Permission): AccessGrant[] {
	if (permission === ORGS_ALL_PERMISSION) {
		return [
			fillRequiredWildcards({
				resource: "orgs",
				action: "view",
				org: GRANT_WILDCARD,
				orgTag: null,
				tag: null,
				location: null,
				id: null,
			}),
		]
	}
	if (permission === SYSTEM_ADMIN_PERMISSION) {
		return [
			fillRequiredWildcards({
				resource: "system",
				action: "admin",
				org: null,
				orgTag: null,
				tag: null,
				location: null,
				id: null,
			}),
			fillRequiredWildcards({
				resource: "orgs",
				action: "view",
				org: GRANT_WILDCARD,
				orgTag: null,
				tag: null,
				location: null,
				id: null,
			}),
		]
	}

	const capability = capabilityForPermission(permission)
	if (!capability) {
		return []
	}
	return [
		fillRequiredWildcards({
			resource: capability.resource,
			action: capability.action,
			org: null,
			orgTag: null,
			tag: null,
			location: null,
			id: null,
		}),
	]
}

function grantsForOrgPermission(permission: Permission, membership: OrgMembership): AccessGrant[] {
	const capability = capabilityForPermission(permission)
	if (!capability) {
		return []
	}

	const dimensions = RESOURCE_DIMENSIONS[capability.resource]
	return [
		fillRequiredWildcards({
			resource: capability.resource,
			action: capability.action,
			org: membership.org,
			orgTag: membership.orgTag,
			tag: dimensions.tag ? GRANT_WILDCARD : null,
			location: dimensions.location ? GRANT_WILDCARD : null,
			id: null,
		}),
	]
}

function uniquePermissions(values: readonly Permission[]): Permission[] {
	return [...new Set(values)]
}
