import { hasAllOrganizations, isOwnerRole, isSystemAdmin, roleHasAllOrganizations } from "@/lib/auth/permissions"
import { GRANT_WILDCARD, hasGrant, hasOrgWildcard } from "@/lib/auth/grants"
import { roleNeedsOrganization } from "@/lib/auth/permission-scopes"
import type {
	AccessMode,
	LocationRecord,
	MachineRecord,
	ResourceAccess,
	RoleRecord,
	SessionUser,
	UserRecord,
	AccessibleOrg,
} from "@/types/domain"

export const ALL_RESOURCE_ACCESS: ResourceAccess = {
	mode: "all",
	organizationSlugs: [],
	organizationTags: [],
	locationIds: [],
	machineIds: [],
	machineTags: [],
}

export function orgSlugFromPath(path: string): string {
	return path.split("/").filter(Boolean)[0] ?? ""
}

export function emptyLimitedAccess(): ResourceAccess {
	return {
		mode: "limited",
		organizationSlugs: [],
		organizationTags: [],
		locationIds: [],
		machineIds: [],
		machineTags: [],
	}
}

export function normalizeResourceAccess(value: Partial<ResourceAccess> | null | undefined): ResourceAccess {
	return {
		mode: value?.mode === "limited" ? "limited" : "all",
		organizationSlugs: uniqueStrings(value?.organizationSlugs),
		organizationTags: uniqueStrings(value?.organizationTags),
		locationIds: uniqueStrings(value?.locationIds),
		machineIds: uniqueStrings(value?.machineIds),
		machineTags: uniqueStrings(value?.machineTags),
	}
}

export function isLimitedAccessComplete(access: ResourceAccess): boolean {
	return (
		access.organizationSlugs.length > 0 ||
		access.organizationTags.length > 0 ||
		access.locationIds.length > 0 ||
		access.machineIds.length > 0 ||
		access.machineTags.length > 0
	)
}

export function isResourceAccessComplete(access: ResourceAccess): boolean {
	return access.mode === "all" || isLimitedAccessComplete(access)
}

export function requiresSingleOrganization(role: Pick<RoleRecord, "permissions"> | null | undefined): boolean {
	return roleNeedsOrganization(role) && !roleHasAllOrganizations(role)
}

export function resourceAccessFromMembership(input: {
	org?: string | null
	orgTag?: string | null
} | null | undefined): ResourceAccess | null {
	const org = input?.org?.trim() ?? ""
	const orgTag = input?.orgTag?.trim() ?? ""
	if (org === GRANT_WILDCARD && !orgTag) {
		return ALL_RESOURCE_ACCESS
	}
	if (org && orgTag) {
		return null
	}
	if (org) {
		return {
			...emptyLimitedAccess(),
			organizationSlugs: [org],
		}
	}
	if (orgTag) {
		return {
			...emptyLimitedAccess(),
			organizationTags: [orgTag],
		}
	}
	return null
}

export function validateAccessForRole(
	role: Pick<RoleRecord, "permissions"> | null | undefined,
	access: ResourceAccess,
): string | null {
	if (!roleNeedsOrganization(role) || roleHasAllOrganizations(role) || isOwnerRole(role)) {
		return null
	}
	if (access.mode === "all") {
		return "This role must belong to exactly one organization or an organization tag."
	}
	if (access.organizationTags.length > 0) {
		return null
	}
	if (access.organizationSlugs.length !== 1) {
		return "This role must belong to exactly one organization or an organization tag."
	}
	return null
}

export function resolveResourceAccess(user: {
	permissions?: readonly string[]
	extraPermissions?: readonly string[]
	resourceAccess?: ResourceAccess | null
	scopePath?: string
	orgSlug?: string
}): ResourceAccess {
	let access: ResourceAccess
	if (user.resourceAccess) {
		access = normalizeResourceAccess(user.resourceAccess)
	} else if (hasAllOrganizations(user)) {
		return ALL_RESOURCE_ACCESS
	} else if (!user.scopePath || user.scopePath === "/") {
		access = ALL_RESOURCE_ACCESS
	} else {
		const org = orgSlugFromPath(user.scopePath) || user.orgSlug || ""
		access = {
			mode: "limited",
			organizationSlugs: org ? [org] : [],
			organizationTags: [],
			locationIds: [],
			machineIds: [],
			machineTags: [],
		}
	}

	if (!hasAllOrganizations(user)) {
		const slug = access.organizationSlugs[0] || user.orgSlug || ""
		return {
			mode: "limited",
			organizationSlugs: slug ? [slug] : [],
			organizationTags: access.organizationTags,
			locationIds: access.locationIds,
			machineIds: access.machineIds,
			machineTags: access.machineTags,
		}
	}

	return access
}

export function scopePathForAccess(access: ResourceAccess): string {
	if (access.mode === "all") {
		return "/"
	}
	if (access.organizationSlugs.length === 1 && access.organizationSlugs[0]) {
		return `/${access.organizationSlugs[0]}`
	}
	return "/"
}

export function hasUnrestrictedAccess(
	user: Pick<SessionUser, "permissions" | "extraPermissions" | "resourceAccess" | "grants">,
): boolean {
	if (hasAllOrganizations(user) || hasOrgWildcard(user.grants)) {
		return true
	}
	return resolveResourceAccess(user).mode === "all"
}

function orgTagsFor(
	user: { accessibleOrgs?: AccessibleOrg[] },
	slug: string,
): string[] {
	return user.accessibleOrgs?.find((org) => org.slug === slug)?.tags ?? []
}

export function canSeeLocation(
	user: Pick<SessionUser, "permissions" | "extraPermissions" | "resourceAccess" | "grants" | "accessibleOrgs">,
	location: Pick<LocationRecord, "id" | "orgSlug" | "tags">,
): boolean {
	if (isSystemAdmin(user) || hasAllOrganizations(user) || hasOrgWildcard(user.grants)) {
		return true
	}
	if (user.grants?.length) {
		return hasGrant(user.grants, {
			resource: "locations",
			action: "view",
			org: location.orgSlug,
			orgTags: orgTagsFor(user, location.orgSlug),
			tags: location.tags,
			id: location.id,
		})
	}
	if (hasAllOrganizations(user)) {
		return true
	}
	const access = resolveResourceAccess(user)
	if (access.mode === "all") {
		return true
	}
	if (access.organizationSlugs.length > 0 && !access.organizationSlugs.includes(location.orgSlug)) {
		return false
	}
	if (access.locationIds.length > 0) {
		return access.locationIds.includes(location.id)
	}
	return access.organizationSlugs.length > 0
}

export function canSeeMachine(
	user: Pick<SessionUser, "permissions" | "extraPermissions" | "resourceAccess" | "grants" | "accessibleOrgs">,
	machine: Pick<MachineRecord, "id" | "orgSlug" | "locationId" | "tags">,
): boolean {
	if (isSystemAdmin(user) || hasAllOrganizations(user) || hasOrgWildcard(user.grants)) {
		return true
	}
	if (user.grants?.length) {
		return hasGrant(user.grants, {
			resource: "machines",
			action: "view",
			org: machine.orgSlug,
			orgTags: orgTagsFor(user, machine.orgSlug),
			tags: machine.tags,
			location: machine.locationId,
			id: machine.id,
		})
	}
	if (hasAllOrganizations(user)) {
		return true
	}
	const access = resolveResourceAccess(user)
	if (access.mode === "all") {
		return true
	}
	if (access.organizationSlugs.length > 0 && !access.organizationSlugs.includes(machine.orgSlug)) {
		return false
	}

	const hasNarrow =
		access.locationIds.length > 0 || access.machineIds.length > 0 || access.machineTags.length > 0
	if (!hasNarrow) {
		return access.organizationSlugs.length > 0
	}

	if (machine.locationId && access.locationIds.includes(machine.locationId)) {
		return true
	}
	if (access.machineIds.includes(machine.id)) {
		return true
	}
	if (machine.tags.some((tag) => access.machineTags.includes(tag))) {
		return true
	}
	return false
}

export function filterLocations<T extends Pick<LocationRecord, "id" | "orgSlug" | "tags">>(
	user: Pick<SessionUser, "permissions" | "extraPermissions" | "resourceAccess" | "grants" | "accessibleOrgs">,
	locations: T[],
): T[] {
	return locations.filter((location) => canSeeLocation(user, location))
}

export function filterMachines<T extends Pick<MachineRecord, "id" | "orgSlug" | "locationId" | "tags">>(
	user: Pick<SessionUser, "permissions" | "extraPermissions" | "resourceAccess" | "grants" | "accessibleOrgs">,
	machines: T[],
): T[] {
	return machines.filter((machine) => canSeeMachine(user, machine))
}

export function canAssignRole(
	actor: Pick<SessionUser, "roleRank" | "permissions" | "extraPermissions">,
	targetRole: Pick<RoleRecord, "rank" | "permissions" | "slug">,
): boolean {
	if (isOwnerRole(targetRole)) {
		return false
	}
	if (isSystemAdmin(actor)) {
		return true
	}
	return targetRole.rank < actor.roleRank
}

export function assignableRoles(
	actor: Pick<SessionUser, "roleRank" | "permissions" | "extraPermissions">,
	roles: RoleRecord[],
): RoleRecord[] {
	return roles.filter((role) => canAssignRole(actor, role))
}

export function inSameOrganization(
	actor: Pick<SessionUser, "permissions" | "extraPermissions" | "orgSlug" | "grants" | "accessibleOrgs" | "activeOrgSlug">,
	target: Pick<UserRecord, "orgSlug" | "resourceAccess" | "memberships" | "tags">,
): boolean {
	if (hasAllOrganizations(actor) || isSystemAdmin(actor) || hasOrgWildcard(actor.grants)) {
		return true
	}
	const active = actor.activeOrgSlug || actor.orgSlug
	if (target.orgSlug === active || target.orgSlug === actor.orgSlug) {
		return true
	}
	if (target.resourceAccess.organizationSlugs.includes(active)) {
		return true
	}
	if (target.memberships?.some((membership) => membership.org === active || membership.org === GRANT_WILDCARD)) {
		return true
	}
	return target.resourceAccess.organizationTags.some((tag) =>
		actor.accessibleOrgs?.find((org) => org.slug === active)?.tags.includes(tag),
	)
}

export function canManageUser(
	actor: Pick<SessionUser, "id" | "roleRank" | "permissions" | "extraPermissions" | "orgSlug" | "grants" | "accessibleOrgs" | "activeOrgSlug">,
	target: Pick<UserRecord, "id" | "roleRank" | "orgSlug" | "resourceAccess" | "memberships" | "tags">,
): boolean {
	if (actor.id === target.id) {
		return false
	}
	if (isSystemAdmin(actor)) {
		return true
	}
	if (target.roleRank >= actor.roleRank) {
		return false
	}
	return inSameOrganization(actor, target)
}

export function canSeeTeamMember(
	actor: Pick<SessionUser, "id" | "roleRank" | "permissions" | "extraPermissions" | "orgSlug" | "grants" | "accessibleOrgs" | "activeOrgSlug">,
	target: Pick<UserRecord, "id" | "roleRank" | "orgSlug" | "resourceAccess" | "memberships" | "tags">,
): boolean {
	if (actor.id === target.id) {
		return true
	}
	if (isSystemAdmin(actor) || hasAllOrganizations(actor)) {
		return true
	}
	return inSameOrganization(actor, target) && canManageUser(actor, target)
}

export function canGrantResourceAccess(
	actor: Pick<SessionUser, "permissions" | "extraPermissions" | "resourceAccess" | "grants" | "accessibleOrgs">,
	grant: ResourceAccess,
	context: { locations: LocationRecord[]; machines: MachineRecord[] },
): boolean {
	if (hasAllOrganizations(actor) || isSystemAdmin(actor) || hasOrgWildcard(actor.grants)) {
		return isResourceAccessComplete(grant)
	}
	if (!isResourceAccessComplete(grant)) {
		return false
	}
	if (grant.mode === "all") {
		return hasUnrestrictedAccess(actor)
	}
	if (hasUnrestrictedAccess(actor)) {
		return true
	}

	const actorAccess = resolveResourceAccess(actor)
	for (const slug of grant.organizationSlugs) {
		if (!actorAccess.organizationSlugs.includes(slug)) {
			return false
		}
	}
	for (const id of grant.locationIds) {
		const location = context.locations.find((item) => item.id === id)
		if (!location || !canSeeLocation(actor, location)) {
			return false
		}
	}
	for (const id of grant.machineIds) {
		const machine = context.machines.find((item) => item.id === id)
		if (!machine || !canSeeMachine(actor, machine)) {
			return false
		}
	}
	if (actorAccess.machineTags.length > 0) {
		return grant.machineTags.every((tag) => actorAccess.machineTags.includes(tag))
	}
	return true
}

export function summarizeResourceAccess(access: ResourceAccess): string {
	if (access.mode === "all") {
		return "All locations and machines"
	}
	const parts: string[] = []
	if (access.organizationSlugs.length > 0) {
		parts.push(`${access.organizationSlugs.length} org${access.organizationSlugs.length === 1 ? "" : "s"}`)
	}
	if (access.organizationTags.length > 0) {
		parts.push(`org tags: ${access.organizationTags.join(", ")}`)
	}
	if (access.locationIds.length > 0) {
		parts.push(`${access.locationIds.length} location${access.locationIds.length === 1 ? "" : "s"}`)
	}
	if (access.machineIds.length > 0) {
		parts.push(`${access.machineIds.length} machine${access.machineIds.length === 1 ? "" : "s"}`)
	}
	if (access.machineTags.length > 0) {
		parts.push(`tags: ${access.machineTags.join(", ")}`)
	}
	return parts.join(" · ") || "No resources"
}

function uniqueStrings(values: string[] | undefined): string[] {
	return [...new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0))]
}

export function isAccessMode(value: unknown): value is AccessMode {
	return value === "all" || value === "limited"
}
