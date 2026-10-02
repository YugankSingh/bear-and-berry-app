import { describe, expect, it } from "vitest"
import {
	applyWorkspaceCookie,
	canAccessAdminWorkspace,
	canUseOrganization,
	ADMIN_NAV,
	ORG_NAV,
} from "@/lib/auth/workspace"
import { hasPermission } from "@/lib/auth/permissions"
import { grant, sessionUser } from "../helpers/auth"

describe("workspace — every switch outcome", () => {
	it("org workspace cookie ignored when org not accessible", () => {
		const user = sessionUser({
			accessibleOrgs: [{ id: "1", slug: "bear-and-berry", name: "B", tags: [] }],
			grants: [grant("dashboard", "view", { org: "bear-and-berry" })],
			activeOrgSlug: "bear-and-berry",
			orgSlug: "bear-and-berry",
			orgId: "1",
		})
		const next = applyWorkspaceCookie(user, "unknown-org")
		expect(next).toEqual(user)
		expect(canUseOrganization(user, "unknown-org")).toBe(false)
	})

	it("org workspace accepted by slug or id", () => {
		const user = sessionUser({
			accessibleOrgs: [{ id: "org-vf-id", slug: "vendforge-labs", name: "V", tags: ["cms"] }],
			grants: [grant("dashboard", "view", { org: "vendforge-labs" })],
			orgId: "home",
			orgSlug: "bear-and-berry",
			activeOrgSlug: "bear-and-berry",
		})
		expect(canUseOrganization(user, "vendforge-labs")).toBe(true)
		expect(canUseOrganization(user, "org-vf-id")).toBe(true)
		const bySlug = applyWorkspaceCookie(user, "vendforge-labs")
		expect(bySlug.orgId).toBe("org-vf-id")
		expect(bySlug.orgSlug).toBe("vendforge-labs")
		expect(bySlug.activeOrgSlug).toBe("vendforge-labs")
		const byId = applyWorkspaceCookie(user, "org-vf-id")
		expect(byId.orgSlug).toBe("vendforge-labs")
		expect(byId.orgId).toBe("org-vf-id")
	})

	it("admin workspace only when canAccessAdmin", () => {
		const denied = sessionUser({ canAccessAdmin: false, activeOrgSlug: "bear-and-berry" })
		expect(applyWorkspaceCookie(denied, "admin").activeOrgSlug).toBe("bear-and-berry")

		const allowed = sessionUser({ canAccessAdmin: true, activeOrgSlug: "bear-and-berry" })
		expect(applyWorkspaceCookie(allowed, "admin").activeOrgSlug).toBe("")
	})

	it("empty workspace leaves user unchanged", () => {
		const user = sessionUser()
		expect(applyWorkspaceCookie(user, undefined)).toEqual(user)
		expect(applyWorkspaceCookie(user, "")).toEqual(user)
	})

	it("canAccessAdminWorkspace true for each qualifying capability", () => {
		const cases = [
			{ permissions: ["system:admin"], grants: [grant("system", "admin")] },
			{ permissions: ["orgs:all"], grants: [grant("orgs", "view", { org: "*" })] },
			{ permissions: ["developer:read"], grants: [grant("developer", "view")] },
			{ permissions: ["cms:read"], grants: [grant("cms", "view")] },
			{ permissions: ["roles:write"], grants: [grant("roles", "edit")] },
		] as const

		for (const row of cases) {
			expect(canAccessAdminWorkspace(sessionUser({ ...row }))).toBe(true)
		}
		expect(
			canAccessAdminWorkspace(
				sessionUser({
					permissions: ["dashboard:read", "machines:read"],
					grants: [
						grant("dashboard", "view", { org: "bear-and-berry" }),
						grant("machines", "view", { org: "bear-and-berry" }),
					],
				}),
			),
		).toBe(false)
	})
})

describe("nav permission contracts", () => {
	it("every ORG_NAV item permission is a real permission key", () => {
		for (const item of ORG_NAV) {
			expect(typeof item.permission).toBe("string")
			expect(item.permission.includes(":")).toBe(true)
		}
	})

	it("every ADMIN_NAV item permission is a real permission key", () => {
		for (const item of ADMIN_NAV) {
			expect(typeof item.permission).toBe("string")
		}
	})

	it("ORG_NAV does not contain leads or cms", () => {
		expect(ORG_NAV.some((item) => item.href.includes("leads"))).toBe(false)
		expect(ORG_NAV.some((item) => item.href.includes("cms"))).toBe(false)
	})

	it("ADMIN_NAV includes leads and cms entries", () => {
		expect(ADMIN_NAV.some((item) => item.href.includes("leads"))).toBe(true)
		expect(ADMIN_NAV.some((item) => item.href.includes("cms"))).toBe(true)
	})

	it("user without permission cannot satisfy any ORG_NAV item", () => {
		const user = sessionUser({ permissions: [], grants: [] })
		for (const item of ORG_NAV) {
			expect(hasPermission(user, item.permission)).toBe(false)
		}
	})
})
