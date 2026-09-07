import {
	parseGrant,
	stringifyGrant,
	grantMatches,
	hasGrant,
	hasCapability,
	fillRequiredWildcards,
} from "../lib/auth/grants"
import { compileGrants } from "../lib/auth/compile-grants"
import type { Permission } from "../types/domain"

function assert(condition: unknown, message: string) {
	if (!condition) {
		throw new Error(message)
	}
}

const allUsersView = parseGrant("users-org:*=view")
assert(allUsersView, "parse users-org:*=view")
assert(stringifyGrant(allUsersView!) === "users-org:*-tag:*=view", "short org:* fills tag:*")

assert(parseGrant("users-org:bear-and-berry=view")?.org === "bear-and-berry", "hyphenated org slug")

const tagged = parseGrant("users-org:*-tag:lkjahiusodf=edit")
assert(tagged?.org === "*" && tagged.tag === "lkjahiusodf" && tagged.action === "edit", "org * plus tag")

const orgTag = parseGrant("users-orgtag:poih9pgdaf=view")
assert(orgTag?.org == null && orgTag?.orgTag === "poih9pgdaf", "orgtag without org")

assert(parseGrant("users-view") == null, "missing org is invalid")
assert(parseGrant("users-org:=view") == null, "empty org is invalid")
assert(parseGrant("users=view") == null, "users without org is invalid")

const cmsGrant = parseGrant("cms-tag:guides=edit")
assert(cmsGrant?.resource === "cms" && cmsGrant.tag === "guides" && cmsGrant.org == null, "cms tag grant has no org")
assert(parseGrant("cms=edit")?.tag === "*", "cms fills tag:*")
assert(parseGrant("cms-org:bear-and-berry=edit")?.org == null, "legacy cms org grants are stripped to platform")
assert(parseGrant("system-org:*=admin")?.org == null, "legacy system org grants are stripped to platform")

assert(
	grantMatches(allUsersView!, {
		resource: "users",
		action: "view",
		org: "bear-and-berry",
		tags: ["staff"],
	}),
	"* org matches a specific org",
)

assert(
	!grantMatches(parseGrant("users-org:bear-and-berry-tag:*=view")!, {
		resource: "users",
		action: "view",
		org: "vendforge-labs",
		tags: [],
	}),
	"specific org does not match another org",
)

assert(
	grantMatches(orgTag!, {
		resource: "users",
		action: "view",
		org: "bear-and-berry",
		orgTags: ["poih9pgdaf", "fleet"],
	}),
	"org tag grant matches orgs that have the tag",
)

assert(
	!grantMatches(orgTag!, {
		resource: "users",
		action: "view",
		org: "bear-and-berry",
		orgTags: ["fleet"],
	}),
	"org tag grant does not match other tags",
)

const machineGrant = fillRequiredWildcards({
	resource: "machines",
	action: "view",
	org: "bear-and-berry",
	orgTag: null,
	tag: null,
	location: null,
	id: null,
})
assert(machineGrant.tag === "*" && machineGrant.location === "*", "machines fill location:* and tag:*")

const compiled = compileGrants({
	permissions: ["users:read", "machines:read"] as Permission[],
	memberships: [{ org: "bear-and-berry", orgTag: null, role: "admin" }],
	orgSlug: "bear-and-berry",
})
assert(
	hasCapability(compiled, { resource: "users", action: "view", org: "bear-and-berry" }),
	"compiled users view for membership org",
)
assert(
	hasGrant(compiled, {
		resource: "machines",
		action: "view",
		org: "bear-and-berry",
		tags: ["pilot"],
		location: "loc-1",
		id: "m-1",
	}),
	"compiled machines view with wildcards matches a machine",
)
assert(
	!hasCapability(compiled, { resource: "users", action: "view", org: "other-org" }),
	"compiled grant does not leak to another org",
)

const platform = compileGrants({
	permissions: ["users:read", "orgs:all"] as Permission[],
	memberships: [{ org: "*", orgTag: null, role: "super_admin" }],
})
assert(
	hasCapability(platform, { resource: "users", action: "view", org: "anything" }),
	"org:* membership compiles to all orgs",
)

const mixed = compileGrants({
	permissions: ["inventory:read", "cms:write"] as Permission[],
	memberships: [{ org: "bear-and-berry", orgTag: null, role: "admin" }],
})
const mixedCms = mixed.find((grant) => grant.resource === "cms")
const mixedInventory = mixed.find((grant) => grant.resource === "inventory")
assert(mixedCms?.org == null && mixedCms?.tag === "*", "cms compiles without org on a mixed role")
assert(mixedInventory?.org === "bear-and-berry", "inventory compiles against the membership org")
assert(
	hasCapability(mixed, { resource: "cms", action: "edit", org: "other-org" }),
	"platform cms is not bound by the assigned organization",
)
assert(
	!hasCapability(mixed, { resource: "inventory", action: "view", org: "other-org" }),
	"org-bound inventory stays on the assigned organization",
)

const extras = compileGrants({
	permissions: ["dashboard:read"] as Permission[],
	memberships: [{ org: "bear-and-berry", orgTag: null, role: "viewer" }],
	extraGrants: [
		fillRequiredWildcards({
			resource: "inventory",
			action: "view",
			org: "vendforge-labs",
			orgTag: null,
			tag: null,
			location: "loc-9",
			id: null,
		}),
	],
})
assert(
	hasGrant(extras, {
		resource: "inventory",
		action: "view",
		org: "vendforge-labs",
		tags: ["anything"],
		location: "loc-9",
	}),
	"extra inventory grant can use a different org and a location",
)
assert(
	!hasGrant(extras, {
		resource: "inventory",
		action: "view",
		org: "bear-and-berry",
		tags: ["anything"],
		location: "loc-9",
	}),
	"extra inventory does not inherit the role membership org",
)

const superAdmin = compileGrants({
	permissions: ["system:admin", "inventory:read", "cms:write"] as Permission[],
	memberships: [{ org: "bear-and-berry", orgTag: null, role: "super_admin" }],
})
assert(
	hasCapability(superAdmin, { resource: "inventory", action: "view", org: "other-org" }),
	"super admin org-bound grants compile as org:* even with a home org membership",
)
assert(superAdmin.find((grant) => grant.resource === "cms")?.org == null, "super admin cms stays platform")
assert(hasGrant(superAdmin, { resource: "machines", action: "view", org: "anything" }), "super admin hasGrant bypass")

console.log("grant tests passed")
