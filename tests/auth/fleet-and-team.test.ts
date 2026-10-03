import { describe, expect, it } from "vitest"
import { canSeeLocation, canSeeMachine } from "@/lib/auth/fleet-access"
import { canAssignRole, canManageUser } from "@/lib/auth/team-access"
import { canAccessCms, visibleNavItems } from "@/lib/auth/rbac"
import { grant, sessionUser } from "../helpers/auth"
import type { RoleRecord, UserRecord } from "@/types/domain"

function role(slug: string, rank: number, permissions: RoleRecord["permissions"] = []): RoleRecord {
	return {
		id: slug,
		slug,
		name: slug,
		description: "",
		rank,
		permissions,
		isSystem: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	}
}

function member(partial: Partial<UserRecord> = {}): UserRecord {
	return {
		id: "t1",
		name: "T",
		email: "t@example.com",
		role: "viewer",
		roleName: "Viewer",
		roleRank: 10,
		orgId: "org-bnb-id",
		orgSlug: "bear-and-berry",
		organization: "Bear & Berry",
		scopePath: "/bear-and-berry",
		tags: [],
		isActive: true,
		accessStatus: "invited",
		resourceAccess: {
			mode: "all",
			organizationSlugs: [],
			organizationTags: [],
			locationIds: [],
			machineIds: [],
			machineTags: [],
		},
		memberships: [{ org: "bear-and-berry", orgTag: null, role: "viewer" }],
		extraPermissions: [],
		extraGrants: [],
		grants: [],
		grantKeys: [],
		permissions: ["dashboard:read"],
		emailVerified: true,
		passwordReady: true,
		inviteState: "none",
		inviteExpiresAt: null,
		deletedAt: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...partial,
	}
}

describe("fleet visibility", () => {
	const location = { id: "loc-1", orgSlug: "bear-and-berry", tags: ["north"] }
	const machine = {
		id: "m-1",
		orgSlug: "bear-and-berry",
		locationId: "loc-1",
		tags: ["pilot"],
	}

	it("system admin sees everything", () => {
		const user = sessionUser({
			permissions: ["system:admin"],
			grants: [grant("system", "admin")],
		})
		expect(canSeeLocation(user, location)).toBe(true)
		expect(canSeeMachine(user, machine)).toBe(true)
		expect(canSeeLocation(user, { ...location, orgSlug: "other" })).toBe(true)
	})

	it("org grant sees matching org only", () => {
		const user = sessionUser({
			permissions: ["locations:read", "machines:read"],
			grants: [
				grant("locations", "view", { org: "bear-and-berry" }),
				grant("machines", "view", { org: "bear-and-berry" }),
			],
			accessibleOrgs: [{ id: "1", slug: "bear-and-berry", name: "B", tags: [] }],
		})
		expect(canSeeLocation(user, location)).toBe(true)
		expect(canSeeMachine(user, machine)).toBe(true)
		expect(canSeeLocation(user, { ...location, orgSlug: "vendforge-labs" })).toBe(false)
		expect(canSeeMachine(user, { ...machine, orgSlug: "vendforge-labs" })).toBe(false)
	})

	it("tag-limited machine grant rejects other tags", () => {
		const user = sessionUser({
			permissions: ["machines:read"],
			grants: [grant("machines", "view", { org: "bear-and-berry", tag: "pilot" })],
			accessibleOrgs: [{ id: "1", slug: "bear-and-berry", name: "B", tags: [] }],
		})
		expect(canSeeMachine(user, machine)).toBe(true)
		expect(canSeeMachine(user, { ...machine, tags: ["other"] })).toBe(false)
	})

	it("id-limited grant only matches that id", () => {
		const user = sessionUser({
			permissions: ["machines:read"],
			grants: [grant("machines", "view", { org: "bear-and-berry", id: "m-1" })],
			accessibleOrgs: [{ id: "1", slug: "bear-and-berry", name: "B", tags: [] }],
		})
		expect(canSeeMachine(user, machine)).toBe(true)
		expect(canSeeMachine(user, { ...machine, id: "m-2" })).toBe(false)
	})

	it("location-limited machine grant rejects other locations", () => {
		const user = sessionUser({
			permissions: ["machines:read"],
			grants: [grant("machines", "view", { org: "bear-and-berry", location: "loc-1" })],
			accessibleOrgs: [{ id: "1", slug: "bear-and-berry", name: "B", tags: [] }],
		})
		expect(canSeeMachine(user, machine)).toBe(true)
		expect(canSeeMachine(user, { ...machine, locationId: "loc-9" })).toBe(false)
	})
})

describe("role assignment & team manage — exhaustive edges", () => {
	it("cannot assign owner even as system admin", () => {
		const actor = sessionUser({
			roleRank: 100,
			permissions: ["system:admin"],
			grants: [grant("system", "admin")],
		})
		expect(canAssignRole(actor, role("super_admin", 100, ["system:admin"]))).toBe(false)
	})

	it("rank matrix: only strictly lower ranks are assignable", () => {
		const actor = sessionUser({ roleRank: 80 })
		expect(canAssignRole(actor, role("admin", 80))).toBe(false)
		expect(canAssignRole(actor, role("admin", 81))).toBe(false)
		expect(canAssignRole(actor, role("operator", 50))).toBe(true)
		expect(canAssignRole(actor, role("viewer", 10))).toBe(true)
	})

	it("manage matrix: self / peer / senior / junior / other-org", () => {
		const actor = sessionUser({
			id: "me",
			roleRank: 80,
			orgSlug: "bear-and-berry",
			activeOrgSlug: "bear-and-berry",
			accessibleOrgs: [{ id: "1", slug: "bear-and-berry", name: "B", tags: [] }],
			grants: [grant("users", "edit", { org: "bear-and-berry" })],
		})
		expect(canManageUser(actor, member({ id: "me", roleRank: 1 }))).toBe(false)
		expect(canManageUser(actor, member({ id: "peer", roleRank: 80 }))).toBe(false)
		expect(canManageUser(actor, member({ id: "boss", roleRank: 100 }))).toBe(false)
		expect(canManageUser(actor, member({ id: "junior", roleRank: 10 }))).toBe(true)
		expect(
			canManageUser(
				actor,
				member({
					id: "other",
					roleRank: 10,
					orgSlug: "vendforge-labs",
					memberships: [{ org: "vendforge-labs", orgTag: null, role: "viewer" }],
					resourceAccess: {
						mode: "limited",
						organizationSlugs: ["vendforge-labs"],
						organizationTags: [],
						locationIds: [],
						machineIds: [],
						machineTags: [],
					},
				}),
			),
		).toBe(false)
	})
})

describe("CMS and nav visibility", () => {
	it("CMS requires cms:read and VendForge or system admin", () => {
		expect(
			canAccessCms(
				sessionUser({
					permissions: ["cms:read"],
					grants: [grant("cms", "view")],
					orgSlug: "bear-and-berry",
				}),
			),
		).toBe(false)
		expect(
			canAccessCms(
				sessionUser({
					permissions: ["cms:read"],
					grants: [grant("cms", "view")],
					orgSlug: "vendforge-labs",
				}),
			),
		).toBe(true)
		expect(
			canAccessCms(
				sessionUser({
					permissions: ["system:admin"],
					grants: [grant("system", "admin")],
					orgSlug: "bear-and-berry",
				}),
			),
		).toBe(true)
		expect(
			canAccessCms(
				sessionUser({
					permissions: ["dashboard:read"],
					grants: [],
					orgSlug: "vendforge-labs",
				}),
			),
		).toBe(false)
	})

	it("org nav never includes leads; admin nav includes leads only with permission", () => {
		const orgNav = visibleNavItems(
			sessionUser({
				permissions: ["dashboard:read", "leads:read", "machines:read"],
				grants: [
					grant("dashboard", "view", { org: "bear-and-berry" }),
					grant("leads", "view"),
					grant("machines", "view", { org: "bear-and-berry" }),
				],
			}),
			"org",
		)
		expect(orgNav.some((item) => item.href.includes("/leads"))).toBe(false)

		const adminWithLeads = visibleNavItems(
			sessionUser({
				permissions: ["dashboard:read", "leads:read"],
				grants: [grant("dashboard", "view", { org: "*" }), grant("leads", "view")],
				canAccessAdmin: true,
			}),
			"admin",
		)
		expect(adminWithLeads.some((item) => item.href.includes("/leads"))).toBe(true)

		const adminNoLeads = visibleNavItems(
			sessionUser({
				permissions: ["dashboard:read", "cms:read"],
				grants: [grant("dashboard", "view", { org: "*" }), grant("cms", "view")],
				canAccessAdmin: true,
				orgSlug: "vendforge-labs",
			}),
			"admin",
		)
		expect(adminNoLeads.some((item) => item.href.includes("/leads"))).toBe(false)
	})
})

describe("org catalog helper export", () => {
	it("exports requireOrgCatalogAccess", async () => {
		const mod = await import("@/lib/auth/require-org-catalog")
		expect(typeof mod.requireOrgCatalogAccess).toBe("function")
	})
})
