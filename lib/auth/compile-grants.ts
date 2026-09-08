import {
	ORGS_ALL_PERMISSION,
	SYSTEM_ADMIN_PERMISSION,
	type Permission,
	type ResourceAccess,
	type RoleRecord,
} from "@/types/domain"
import {
	GRANT_WILDCARD,
	fillRequiredWildcards,
	normalizeMemberships,
	parseGrants,
	stringifyGrants,
	type AccessGrant,
	type AccessibleOrg,
	type GrantAction,
	type GrantResource,
	type OrgMembership,
	RESOURCE_DIMENSIONS,
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
	permissions?: readonly Permission[]
	extraPermissions?: readonly Permission[]
	extraGrants?: readonly AccessGrant[]
	memberships?: readonly OrgMembership[]
	resourceAccess?: ResourceAccess | null
	orgSlug?: string | null
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

export function membershipsFromAccess(input: {
	role: string
	resourceAccess?: ResourceAccess | null
	orgSlug?: string | null
	permissions?: readonly Permission[]
}): OrgMembership[] {
	const access = input.resourceAccess
	const permissions = input.permissions ?? []
	const platform =
		permissions.includes(ORGS_ALL_PERMISSION) ||
		permissions.includes(SYSTEM_ADMIN_PERMISSION) ||
		access?.mode === "all"

	if (platform) {
		return normalizeMemberships([{ org: GRANT_WILDCARD, orgTag: null, role: input.role }])
	}

	const memberships: OrgMembership[] = []
	for (const slug of access?.organizationSlugs ?? []) {
		memberships.push({ org: slug, orgTag: null, role: input.role })
	}
	for (const tag of access?.organizationTags ?? []) {
		memberships.push({ org: null, orgTag: tag, role: input.role })
	}
	if (memberships.length === 0 && input.orgSlug && permissions.some(isOrgBoundPermission)) {
		memberships.push({ org: input.orgSlug, orgTag: null, role: input.role })
	}
	return normalizeMemberships(memberships)
}

export function compileGrants(input: CompileGrantInput): AccessGrant[] {
	const extraGrants = input.extraGrants ?? []
	const extraPermissions = extraGrants.length > 0 ? [] : uniquePermissions(input.extraPermissions ?? [])
	const rolePermissions = uniquePermissions(input.role?.permissions ?? input.permissions ?? [])
	const permissions = uniquePermissions([...rolePermissions, ...extraPermissions])
	const roleSlug = input.role?.slug ?? "viewer"
	const memberships = normalizeMemberships(
		Array.isArray(input.memberships)
			? input.memberships
			: membershipsFromAccess({
					role: roleSlug,
					resourceAccess: input.resourceAccess,
					orgSlug: input.orgSlug,
					permissions,
				}),
	)

	const orgBound = permissions.filter(isOrgBoundPermission)
	const platform = permissions.filter((permission) => !isOrgBoundPermission(permission))
	const allOrganizations =
		permissions.includes(ORGS_ALL_PERMISSION) ||
		permissions.includes(SYSTEM_ADMIN_PERMISSION) ||
		memberships.some((membership) => membership.org === GRANT_WILDCARD)
	const orgMemberships = allOrganizations
		? normalizeMemberships([{ org: GRANT_WILDCARD, orgTag: null, role: roleSlug }])
		: memberships

	const grants: AccessGrant[] = []
	for (const membership of orgMemberships) {
		for (const permission of orgBound) {
			grants.push(...grantsForOrgPermission(permission, membership, allOrganizations ? null : input.resourceAccess))
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

function grantsForOrgPermission(
	permission: Permission,
	membership: OrgMembership,
	access: ResourceAccess | null | undefined,
): AccessGrant[] {
	const capability = capabilityForPermission(permission)
	if (!capability) {
		return []
	}

	const dimensions = RESOURCE_DIMENSIONS[capability.resource]
	return scopeSeeds(capability.resource, membership, access).map((seed) =>
		fillRequiredWildcards({
			resource: capability.resource,
			action: capability.action,
			org: seed.org,
			orgTag: seed.orgTag,
			tag: seed.tag ?? (dimensions.tag ? GRANT_WILDCARD : null),
			location: seed.location ?? (dimensions.location ? GRANT_WILDCARD : null),
			id: seed.id,
		}),
	)
}

function scopeSeeds(
	resource: GrantResource,
	membership: OrgMembership,
	access: ResourceAccess | null | undefined,
): Array<Pick<AccessGrant, "org" | "orgTag" | "tag" | "location" | "id">> {
	const org = membership.org
	const orgTag = membership.orgTag
	const limited = access && access.mode === "limited" ? access : null
	const applies =
		!limited ||
		membership.org === GRANT_WILDCARD ||
		(membership.org != null && limited.organizationSlugs.includes(membership.org)) ||
		(membership.orgTag != null && limited.organizationTags.includes(membership.orgTag))

	if (!applies || !limited || !usesFleetNarrowing(resource)) {
		return [{ org, orgTag, tag: null, location: null, id: null }]
	}

	const seeds: Array<Pick<AccessGrant, "org" | "orgTag" | "tag" | "location" | "id">> = []
	for (const location of limited.locationIds) {
		if (resource === "locations") {
			seeds.push({ org, orgTag, tag: GRANT_WILDCARD, location: null, id: location })
		} else {
			seeds.push({ org, orgTag, tag: GRANT_WILDCARD, location, id: null })
		}
	}
	for (const tag of limited.machineTags) {
		seeds.push({ org, orgTag, tag, location: GRANT_WILDCARD, id: null })
	}
	for (const id of limited.machineIds) {
		seeds.push({ org, orgTag, tag: GRANT_WILDCARD, location: GRANT_WILDCARD, id })
	}
	if (seeds.length === 0) {
		return [{ org, orgTag, tag: null, location: null, id: null }]
	}
	return seeds
}

function usesFleetNarrowing(resource: GrantResource): boolean {
	return resource === "machines" || resource === "inventory" || resource === "revenue" || resource === "locations"
}

function uniquePermissions(values: readonly Permission[]): Permission[] {
	return [...new Set(values)]
}
