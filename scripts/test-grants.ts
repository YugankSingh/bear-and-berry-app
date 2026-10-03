import { compileGrants } from "@/lib/auth/compile-grants"
import {
	fillRequiredWildcards,
	hasCapability,
	hasGrant,
} from "@/lib/auth/grants"

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message)
	}
}

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
	role: { slug: "admin", permissions: ["users:read", "machines:read"] },
	memberships: [{ org: "bear-and-berry", orgTag: null, role: "admin" }],
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
	role: { slug: "super_admin", permissions: ["users:read", "orgs:all"] },
	memberships: [{ org: "*", orgTag: null, role: "super_admin" }],
})
assert(
	hasCapability(platform, { resource: "users", action: "view", org: "anything" }),
	"org:* membership compiles to all orgs",
)

const mixed = compileGrants({
	role: { slug: "admin", permissions: ["inventory:read", "cms:write"] },
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
	role: { slug: "viewer", permissions: ["dashboard:read"] },
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
	role: {
		slug: "super_admin",
		permissions: ["system:admin", "inventory:read", "cms:write"],
	},
	memberships: [{ org: "bear-and-berry", orgTag: null, role: "super_admin" }],
})
assert(
	hasCapability(superAdmin, { resource: "inventory", action: "view", org: "other-org" }),
	"super admin org-bound grants compile as org:* even with a home org membership",
)
assert(superAdmin.find((grant) => grant.resource === "cms")?.org == null, "super admin cms stays platform")
assert(hasGrant(superAdmin, { resource: "machines", action: "view", org: "anything" }), "super admin hasGrant bypass")

console.log("grant tests passed")
