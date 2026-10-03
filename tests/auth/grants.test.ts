import { describe, expect, it } from "vitest"
import {
	parseGrant,
	stringifyGrant,
	grantMatches,
	hasCapability,
	hasGrant,
	fillRequiredWildcards,
} from "@/lib/auth/grants"
import { compileGrants } from "@/lib/auth/compile-grants"
import type { Permission } from "@/types/domain"

describe("grant parsing and matching", () => {
	it("fills required wildcards for org-bound resources", () => {
		const parsed = parseGrant("users-org:*=view")
		expect(parsed).toBeTruthy()
		expect(stringifyGrant(parsed!)).toBe("users-org:*-tag:*=view")
	})

	it("rejects org-bound grants missing org scope", () => {
		expect(parseGrant("users=view")).toBeNull()
		expect(parseGrant("users-org:=view")).toBeNull()
	})

	it("keeps platform cms unbound by org", () => {
		expect(parseGrant("cms-tag:guides=edit")?.org).toBeNull()
		expect(parseGrant("cms=edit")?.tag).toBe("*")
		expect(parseGrant("cms-org:bear-and-berry=edit")?.org).toBeNull()
	})

	it("matches org:* and rejects cross-org", () => {
		const all = parseGrant("users-org:*=view")!
		expect(
			grantMatches(all, {
				resource: "users",
				action: "view",
				org: "bear-and-berry",
				tags: ["staff"],
			}),
		).toBe(true)
		expect(
			grantMatches(parseGrant("users-org:bear-and-berry-tag:*=view")!, {
				resource: "users",
				action: "view",
				org: "vendforge-labs",
				tags: [],
			}),
		).toBe(false)
	})

	it("matches organization tags only when the org carries that tag", () => {
		const orgTag = parseGrant("users-orgtag:cms=view")!
		expect(
			grantMatches(orgTag, {
				resource: "users",
				action: "view",
				org: "vendforge-labs",
				orgTags: ["cms"],
			}),
		).toBe(true)
		expect(
			grantMatches(orgTag, {
				resource: "users",
				action: "view",
				org: "bear-and-berry",
				orgTags: ["fleet"],
			}),
		).toBe(false)
	})
})

describe("compileGrants", () => {
	it("does not leak org-bound grants across memberships", () => {
		const compiled = compileGrants({
			role: { slug: "admin", permissions: ["users:read", "machines:read"] },
			memberships: [{ org: "bear-and-berry", orgTag: null, role: "admin" }],
		})
		expect(hasCapability(compiled, { resource: "users", action: "view", org: "bear-and-berry" })).toBe(true)
		expect(hasCapability(compiled, { resource: "users", action: "view", org: "other-org" })).toBe(false)
		expect(
			hasGrant(compiled, {
				resource: "machines",
				action: "view",
				org: "bear-and-berry",
				tags: ["pilot"],
				location: "loc-1",
				id: "m-1",
			}),
		).toBe(true)
	})

	it("keeps platform permissions unbound while org permissions stay scoped", () => {
		const mixed = compileGrants({
			role: { slug: "admin", permissions: ["inventory:read", "cms:write"] },
			memberships: [{ org: "bear-and-berry", orgTag: null, role: "admin" }],
		})
		expect(mixed.find((g) => g.resource === "cms")?.org).toBeNull()
		expect(hasCapability(mixed, { resource: "cms", action: "edit", org: "other-org" })).toBe(true)
		expect(hasCapability(mixed, { resource: "inventory", action: "view", org: "other-org" })).toBe(false)
	})

	it("honors extra grants on a different org without inheriting membership org", () => {
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
		expect(
			hasGrant(extras, {
				resource: "inventory",
				action: "view",
				org: "vendforge-labs",
				tags: ["x"],
				location: "loc-9",
			}),
		).toBe(true)
		expect(
			hasGrant(extras, {
				resource: "inventory",
				action: "view",
				org: "bear-and-berry",
				tags: ["x"],
				location: "loc-9",
			}),
		).toBe(false)
	})

	it("expands super_admin org-bound grants to org:*", () => {
		const superAdmin = compileGrants({
			role: {
				slug: "super_admin",
				permissions: ["system:admin", "inventory:read", "cms:write"],
			},
			memberships: [{ org: "bear-and-berry", orgTag: null, role: "super_admin" }],
		})
		expect(hasCapability(superAdmin, { resource: "inventory", action: "view", org: "other-org" })).toBe(true)
		expect(superAdmin.find((g) => g.resource === "cms")?.org).toBeNull()
	})
})
