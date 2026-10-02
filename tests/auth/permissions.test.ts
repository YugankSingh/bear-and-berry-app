import { describe, expect, it } from "vitest"
import {
	canGrantAccessGrant,
	hasPermission,
	isSystemAdmin,
} from "@/lib/auth/permissions"
import { grant, sessionUser } from "../helpers/auth"

describe("hasPermission", () => {
	it("denies null users", () => {
		expect(hasPermission(null, "machines:read")).toBe(false)
	})

	it("system:admin short-circuits every permission", () => {
		const user = sessionUser({
			permissions: ["system:admin"],
			grants: [grant("system", "admin")],
		})
		expect(hasPermission(user, "leads:delete")).toBe(true)
		expect(hasPermission(user, "machines:write")).toBe(true)
		expect(isSystemAdmin(user)).toBe(true)
	})

	it("scopes org-bound permissions to the active org", () => {
		const user = sessionUser({
			permissions: ["machines:read"],
			grants: [grant("machines", "view", { org: "bear-and-berry" })],
			activeOrgSlug: "bear-and-berry",
		})
		expect(hasPermission(user, "machines:read")).toBe(true)

		const otherOrg = { ...user, activeOrgSlug: "vendforge-labs" }
		expect(hasPermission(otherOrg, "machines:read")).toBe(false)
	})

	it("treats leads as platform permissions (not org-bound)", () => {
		const user = sessionUser({
			permissions: ["leads:read"],
			grants: [grant("leads", "view")],
			activeOrgSlug: "bear-and-berry",
		})
		expect(hasPermission(user, "leads:read")).toBe(true)
	})

	it("falls back to permissions list when grants are empty", () => {
		const user = sessionUser({
			permissions: ["inventory:read"],
			grants: [],
		})
		expect(hasPermission(user, "inventory:read")).toBe(true)
		expect(hasPermission(user, "inventory:write")).toBe(false)
	})
})

describe("canGrantAccessGrant", () => {
	it("blocks reserved permissions for non-system admins", () => {
		const actor = sessionUser({
			permissions: ["users:grant", "system:admin"],
			grants: [grant("system", "admin"), grant("users", "grant", { org: "*" })],
		})
		// even with system admin this returns true via short-circuit — use non-admin
		const orgAdmin = sessionUser({
			permissions: ["users:grant", "machines:write", "users:write"],
			grants: [
				grant("users", "grant", { org: "bear-and-berry" }),
				grant("machines", "edit", { org: "bear-and-berry" }),
			],
		})
		expect(canGrantAccessGrant(orgAdmin, grant("system", "admin"))).toBe(false)
		expect(canGrantAccessGrant(orgAdmin, grant("orgs", "view", { org: "*" }))).toBe(false)
		expect(canGrantAccessGrant(actor, grant("system", "admin"))).toBe(true)
	})

	it("allows granting a capability only inside orgs the actor already owns", () => {
		const actor = sessionUser({
			permissions: ["users:grant", "machines:write"],
			grants: [
				grant("users", "grant", { org: "bear-and-berry" }),
				grant("machines", "edit", { org: "bear-and-berry" }),
			],
		})
		expect(canGrantAccessGrant(actor, grant("machines", "edit", { org: "bear-and-berry" }))).toBe(true)
		expect(canGrantAccessGrant(actor, grant("machines", "edit", { org: "vendforge-labs" }))).toBe(false)
	})

	it("does not let an org-scoped actor mint org:* grants", () => {
		const actor = sessionUser({
			permissions: ["users:grant", "machines:write"],
			grants: [
				grant("users", "grant", { org: "bear-and-berry" }),
				grant("machines", "edit", { org: "bear-and-berry" }),
			],
		})
		expect(canGrantAccessGrant(actor, grant("machines", "edit", { org: "*" }))).toBe(false)
	})

	it("allows org:* grants only when the actor already has org:* for that capability", () => {
		const actor = sessionUser({
			permissions: ["users:grant", "machines:write", "orgs:all"],
			grants: [
				grant("users", "grant", { org: "*" }),
				grant("machines", "edit", { org: "*" }),
				grant("orgs", "view", { org: "*" }),
			],
		})
		expect(canGrantAccessGrant(actor, grant("machines", "edit", { org: "*" }))).toBe(true)
	})
})
