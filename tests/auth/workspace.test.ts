import { describe, expect, it } from "vitest"
import {
	applyWorkspaceCookie,
	canAccessAdminWorkspace,
	canUseOrganization,
} from "@/lib/auth/workspace"
import { grant, sessionUser } from "../helpers/auth"

describe("workspace access", () => {
	it("blocks forging a workspace cookie for an inaccessible org", () => {
		const user = sessionUser({
			accessibleOrgs: [{ id: "org-bnb-id", slug: "bear-and-berry", name: "Bear & Berry", tags: ["fleet"] }],
			grants: [grant("machines", "view", { org: "bear-and-berry" })],
		})
		expect(canUseOrganization(user, "vendforge-labs")).toBe(false)
		const next = applyWorkspaceCookie(user, "vendforge-labs")
		expect(next.activeOrgSlug).toBe("bear-and-berry")
		expect(next.orgSlug).toBe("bear-and-berry")
		expect(next.orgId).toBe("org-home-id")
	})

	it("updates orgSlug and orgId when switching into an accessible org", () => {
		const user = sessionUser({
			orgId: "org-bnb-id",
			orgSlug: "bear-and-berry",
			accessibleOrgs: [
				{ id: "org-bnb-id", slug: "bear-and-berry", name: "Bear & Berry", tags: ["fleet"] },
				{ id: "org-vf-id", slug: "vendforge-labs", name: "VendForge Labs", tags: ["cms"] },
			],
			grants: [
				grant("machines", "view", { org: "bear-and-berry" }),
				grant("machines", "view", { org: "vendforge-labs" }),
			],
		})
		expect(canUseOrganization(user, "vendforge-labs")).toBe(true)
		const next = applyWorkspaceCookie(user, "vendforge-labs")
		expect(next.activeOrgSlug).toBe("vendforge-labs")
		expect(next.orgSlug).toBe("vendforge-labs")
		expect(next.orgId).toBe("org-vf-id")
	})

	it("allows org:* holders into any catalog org", () => {
		const user = sessionUser({
			grants: [grant("machines", "view", { org: "*" }), grant("orgs", "view", { org: "*" })],
			accessibleOrgs: [{ id: "org-vf-id", slug: "vendforge-labs", name: "VendForge Labs", tags: ["cms"] }],
		})
		expect(canUseOrganization(user, "vendforge-labs")).toBe(true)
	})

	it("gates admin workspace on platform capabilities", () => {
		expect(canAccessAdminWorkspace(sessionUser({ permissions: ["dashboard:read"], grants: [] }))).toBe(false)
		expect(
			canAccessAdminWorkspace(
				sessionUser({
					permissions: ["cms:read"],
					grants: [grant("cms", "view")],
				}),
			),
		).toBe(true)
		expect(
			canAccessAdminWorkspace(
				sessionUser({
					permissions: ["system:admin"],
					grants: [grant("system", "admin")],
				}),
			),
		).toBe(true)
	})

	it("refuses admin workspace switch when canAccessAdmin is false", () => {
		const user = sessionUser({ canAccessAdmin: false, activeOrgSlug: "bear-and-berry" })
		const next = applyWorkspaceCookie(user, "admin")
		expect(next.activeOrgSlug).toBe("bear-and-berry")
	})
})
