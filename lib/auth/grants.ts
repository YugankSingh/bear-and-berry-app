export const GRANT_WILDCARD = "*" as const

export const GRANT_RESOURCES = [
	"dashboard",
	"leads",
	"machines",
	"locations",
	"inventory",
	"revenue",
	"users",
	"roles",
	"settings",
	"cms",
	"orgs",
	"developer",
	"system",
] as const
export type GrantResource = (typeof GRANT_RESOURCES)[number]

export const GRANT_ACTIONS = ["view", "edit", "delete", "grant", "admin"] as const
export type GrantAction = (typeof GRANT_ACTIONS)[number]

export const GRANT_SCOPE_KEYS = ["org", "orgtag", "tag", "location", "id"] as const
export type GrantScopeKey = (typeof GRANT_SCOPE_KEYS)[number]

export type AccessGrant = {
	resource: GrantResource
	action: GrantAction
	org: string | null
	orgTag: string | null
	tag: string | null
	location: string | null
	id: string | null
}

export type OrgMembership = {
	org: string | null
	orgTag: string | null
	role: string
}

export type AccessibleOrg = {
	id: string
	slug: string
	name: string
	tags: string[]
}

export type GrantQuery = {
	resource: GrantResource
	action: GrantAction
	org?: string | null
	orgTags?: readonly string[]
	tags?: readonly string[]
	location?: string | null
	id?: string | null
}

export type ResourceDimensions = {
	org: boolean
	tag: boolean
	location: boolean
	id: boolean
}

export const RESOURCE_DIMENSIONS: Record<GrantResource, ResourceDimensions> = {
	dashboard: { org: true, tag: false, location: false, id: false },
	leads: { org: false, tag: false, location: false, id: false },
	machines: { org: true, tag: true, location: true, id: true },
	locations: { org: true, tag: true, location: false, id: true },
	inventory: { org: true, tag: true, location: true, id: true },
	revenue: { org: true, tag: true, location: true, id: true },
	users: { org: true, tag: true, location: false, id: true },
	roles: { org: false, tag: false, location: false, id: false },
	settings: { org: true, tag: false, location: false, id: false },
	cms: { org: false, tag: true, location: false, id: false },
	orgs: { org: true, tag: false, location: false, id: false },
	developer: { org: false, tag: false, location: false, id: false },
	system: { org: false, tag: false, location: false, id: false },
}

const SCOPE_TOKEN = /^[a-zA-Z0-9_*-]+$/
const RESOURCE_TOKEN = /^[a-z][a-z0-9]*$/

export function isGrantResource(value: unknown): value is GrantResource {
	return typeof value === "string" && (GRANT_RESOURCES as readonly string[]).includes(value)
}

export function isGrantAction(value: unknown): value is GrantAction {
	return typeof value === "string" && (GRANT_ACTIONS as readonly string[]).includes(value)
}

export function isWildcard(value: string | null | undefined): boolean {
	return value === GRANT_WILDCARD
}

export function emptyGrant(resource: GrantResource, action: GrantAction): AccessGrant {
	return {
		resource,
		action,
		org: null,
		orgTag: null,
		tag: null,
		location: null,
		id: null,
	}
}

export function normalizeMembership(value: Partial<OrgMembership> | null | undefined): OrgMembership | null {
	const role = typeof value?.role === "string" ? value.role.trim() : ""
	if (!role) {
		return null
	}
	const org = normalizeScopeValue(value?.org)
	const orgTag = normalizeScopeValue(value?.orgTag)
	if (!org && !orgTag) {
		return null
	}
	return { org, orgTag, role }
}

export function normalizeMemberships(values: readonly Partial<OrgMembership>[] | null | undefined): OrgMembership[] {
	const seen = new Set<string>()
	const result: OrgMembership[] = []
	for (const value of values ?? []) {
		const membership = normalizeMembership(value)
		if (!membership) {
			continue
		}
		const key = `${membership.role}:${membership.org ?? ""}:${membership.orgTag ?? ""}`
		if (seen.has(key)) {
			continue
		}
		seen.add(key)
		result.push(membership)
	}
	return result
}

export function validateMembership(membership: OrgMembership): string | null {
	if (!membership.role) {
		return "Membership is missing a role."
	}
	if (!membership.org && !membership.orgTag) {
		return "Membership needs an organization or an organization tag. Use * for every organization."
	}
	if (membership.org && !SCOPE_TOKEN.test(membership.org)) {
		return "Organization scope is invalid."
	}
	if (membership.orgTag && (isWildcard(membership.orgTag) || !SCOPE_TOKEN.test(membership.orgTag))) {
		return "Organization tag cannot be a wildcard; pick a real tag."
	}
	return null
}

export function validateGrant(grant: AccessGrant): string | null {
	if (!isGrantResource(grant.resource) || !isGrantAction(grant.action)) {
		return "Grant is missing a resource or action."
	}

	const dimensions = RESOURCE_DIMENSIONS[grant.resource]
	if (dimensions.org) {
		if (!grant.org && !grant.orgTag) {
			return "This grant needs org:* , a specific organization, or orgtag:{tag}. Missing org does not mean all."
		}
	}
	if (grant.org && !SCOPE_TOKEN.test(grant.org)) {
		return "Organization scope is invalid."
	}
	if (grant.orgTag && (isWildcard(grant.orgTag) || !SCOPE_TOKEN.test(grant.orgTag))) {
		return "Organization tag cannot be *."
	}
	if (dimensions.tag && !grant.tag) {
		return `${grant.resource} grants must set tag:* or a specific tag.`
	}
	if (!dimensions.tag && grant.tag) {
		return `${grant.resource} does not use entity tags.`
	}
	if (dimensions.location && !grant.location) {
		return `${grant.resource} grants must set location:* or a specific location.`
	}
	if (!dimensions.location && grant.location) {
		return `${grant.resource} does not use locations.`
	}
	if (grant.tag && !SCOPE_TOKEN.test(grant.tag)) {
		return "Tag scope is invalid."
	}
	if (grant.location && !SCOPE_TOKEN.test(grant.location)) {
		return "Location scope is invalid."
	}
	if (grant.id && !SCOPE_TOKEN.test(grant.id)) {
		return "Entity id scope is invalid."
	}
	return null
}

export function stringifyGrant(grant: AccessGrant): string {
	const parts: string[] = [grant.resource]
	if (grant.org) {
		parts.push(`org:${grant.org}`)
	}
	if (grant.orgTag) {
		parts.push(`orgtag:${grant.orgTag}`)
	}
	if (grant.tag) {
		parts.push(`tag:${grant.tag}`)
	}
	if (grant.location) {
		parts.push(`location:${grant.location}`)
	}
	if (grant.id) {
		parts.push(`id:${grant.id}`)
	}
	return `${parts.join("-")}=${grant.action}`
}

export function parseGrant(value: string): AccessGrant | null {
	const trimmed = value.trim()
	const equals = trimmed.lastIndexOf("=")
	if (equals <= 0 || equals === trimmed.length - 1) {
		return null
	}
	const action = trimmed.slice(equals + 1)
	if (!isGrantAction(action)) {
		return null
	}

	const parsed = parseGrantHead(trimmed.slice(0, equals))
	if (!parsed || !isGrantResource(parsed.resource)) {
		return null
	}

	const grant = fillRequiredWildcards({
		...emptyGrant(parsed.resource, action),
		org: parsed.scopes.org ?? null,
		orgTag: parsed.scopes.orgtag ?? null,
		tag: parsed.scopes.tag ?? null,
		location: parsed.scopes.location ?? null,
		id: parsed.scopes.id ?? null,
	})
	return validateGrant(grant) ? null : grant
}

const SCOPE_MARKERS = ["-orgtag:", "-org:", "-tag:", "-location:", "-id:"] as const

function parseGrantHead(head: string): { resource: string; scopes: Record<string, string> } | null {
	let firstIdx = -1
	for (const marker of SCOPE_MARKERS) {
		const idx = head.indexOf(marker)
		if (idx >= 0 && (firstIdx < 0 || idx < firstIdx)) {
			firstIdx = idx
		}
	}
	const resource = firstIdx < 0 ? head : head.slice(0, firstIdx)
	if (!resource || !RESOURCE_TOKEN.test(resource)) {
		return null
	}
	let rest = firstIdx < 0 ? "" : head.slice(firstIdx)
	const scopes: Record<string, string> = {}
	while (rest.length > 0) {
		const marker = SCOPE_MARKERS.find((item) => rest.startsWith(item))
		if (!marker) {
			return null
		}
		rest = rest.slice(marker.length)
		let nextIdx = rest.length
		for (const next of SCOPE_MARKERS) {
			const idx = rest.indexOf(next)
			if (idx >= 0 && idx < nextIdx) {
				nextIdx = idx
			}
		}
		const token = rest.slice(0, nextIdx)
		rest = rest.slice(nextIdx)
		if (!token || !SCOPE_TOKEN.test(token)) {
			return null
		}
		scopes[marker.slice(1, -1)] = token
	}
	return { resource, scopes }
}

export function parseGrants(values: readonly string[] | null | undefined): AccessGrant[] {
	const seen = new Set<string>()
	const grants: AccessGrant[] = []
	for (const value of values ?? []) {
		const grant = parseGrant(value)
		if (!grant) {
			continue
		}
		const key = stringifyGrant(grant)
		if (seen.has(key)) {
			continue
		}
		seen.add(key)
		grants.push(grant)
	}
	return grants
}

export function stringifyGrants(grants: readonly AccessGrant[]): string[] {
	const seen = new Set<string>()
	const keys: string[] = []
	for (const grant of grants) {
		if (validateGrant(grant)) {
			continue
		}
		const key = stringifyGrant(grant)
		if (seen.has(key)) {
			continue
		}
		seen.add(key)
		keys.push(key)
	}
	return keys
}

export function fillRequiredWildcards(grant: AccessGrant): AccessGrant {
	const dimensions = RESOURCE_DIMENSIONS[grant.resource]
	return {
		...grant,
		org: dimensions.org ? grant.org : null,
		orgTag: dimensions.org ? grant.orgTag : null,
		tag: dimensions.tag ? grant.tag ?? GRANT_WILDCARD : null,
		location: dimensions.location ? grant.location ?? GRANT_WILDCARD : null,
		id: grant.id,
	}
}

export function membershipCoversOrg(
	membership: OrgMembership,
	org: { slug: string; tags?: readonly string[] },
): boolean {
	if (isWildcard(membership.org)) {
		return true
	}
	if (membership.org && membership.org === org.slug) {
		return !membership.orgTag || (org.tags ?? []).includes(membership.orgTag)
	}
	if (membership.orgTag) {
		return (org.tags ?? []).includes(membership.orgTag)
	}
	return false
}

export function grantMatchesOrg(
	grant: AccessGrant,
	org: { slug?: string | null; tags?: readonly string[] } | null | undefined,
): boolean {
	const dimensions = RESOURCE_DIMENSIONS[grant.resource]
	if (!dimensions.org && !grant.org && !grant.orgTag) {
		return true
	}
	if (isWildcard(grant.org)) {
		if (grant.orgTag) {
			return Boolean(org?.tags?.includes(grant.orgTag))
		}
		return true
	}
	if (grant.org) {
		if (!org?.slug || grant.org !== org.slug) {
			return false
		}
		if (grant.orgTag) {
			return Boolean(org.tags?.includes(grant.orgTag))
		}
		return true
	}
	if (grant.orgTag) {
		return Boolean(org?.tags?.includes(grant.orgTag))
	}
	return false
}

function tokenMatches(
	granted: string | null,
	actual: string | null | undefined,
	required: boolean,
	wildcardMeansAll: boolean,
): boolean {
	if (!required) {
		return granted == null || isWildcard(granted) || granted === actual
	}
	if (!granted) {
		return false
	}
	if (wildcardMeansAll && isWildcard(granted)) {
		return true
	}
	return Boolean(actual) && granted === actual
}

function tagMatches(granted: string | null, tags: readonly string[] | undefined, required: boolean): boolean {
	if (!required) {
		return granted == null
	}
	if (!granted) {
		return false
	}
	if (isWildcard(granted)) {
		return true
	}
	return Boolean(tags?.includes(granted))
}

export function grantMatches(grant: AccessGrant, query: GrantQuery): boolean {
	if (grant.resource !== query.resource || grant.action !== query.action) {
		return false
	}
	if (validateGrant(grant)) {
		return false
	}
	if (!grantMatchesOrg(grant, { slug: query.org, tags: query.orgTags })) {
		return false
	}

	const dimensions = RESOURCE_DIMENSIONS[grant.resource]
	if (!tagMatches(grant.tag, query.tags, dimensions.tag)) {
		return false
	}
	if (!tokenMatches(grant.location, query.location, dimensions.location, true)) {
		return false
	}
	if (grant.id && !isWildcard(grant.id) && grant.id !== query.id) {
		return false
	}
	return true
}

export function hasGrant(grants: readonly AccessGrant[] | null | undefined, query: GrantQuery): boolean {
	if (hasAnyCapability(grants, "system", "admin")) {
		return true
	}
	return (grants ?? []).some((grant) => grantMatches(grant, query))
}

export function hasCapability(
	grants: readonly AccessGrant[] | null | undefined,
	query: Pick<GrantQuery, "resource" | "action" | "org" | "orgTags">,
): boolean {
	return (grants ?? []).some((grant) => {
		if (grant.resource !== query.resource || grant.action !== query.action) {
			return false
		}
		if (validateGrant(grant)) {
			return false
		}
		return grantMatchesOrg(grant, { slug: query.org, tags: query.orgTags })
	})
}

export function hasAnyCapability(
	grants: readonly AccessGrant[] | null | undefined,
	resource: GrantResource,
	action: GrantAction,
): boolean {
	return (grants ?? []).some(
		(grant) => grant.resource === resource && grant.action === action && !validateGrant(grant),
	)
}

export function hasOrgWildcard(grants: readonly AccessGrant[] | null | undefined): boolean {
	return (grants ?? []).some((grant) => isWildcard(grant.org) && !grant.orgTag)
}

export function orgsFromGrants(
	grants: readonly AccessGrant[],
	catalog: readonly AccessibleOrg[],
): AccessibleOrg[] {
	if (hasOrgWildcard(grants)) {
		return [...catalog]
	}
	const matched = catalog.filter((org) =>
		grants.some((grant) => grantMatchesOrg(grant, org)),
	)
	return matched
}

export function summarizeGrant(grant: AccessGrant): string {
	return stringifyGrant(grant)
}

function normalizeScopeValue(value: unknown): string | null {
	if (typeof value !== "string") {
		return null
	}
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}
