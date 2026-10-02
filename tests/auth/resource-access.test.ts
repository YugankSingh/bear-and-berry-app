import { describe, expect, it } from "vitest"
import { canAssignRole, canManageUser, canSeeTeamMember } from "@/lib/auth/resource-access"
import { grant, sessionUser } from "../helpers/auth"
import type { RoleRecord, UserRecord } from "@/types/domain"

function role(partial: Partial<RoleRecord> & Pick<RoleRecord, "slug" | "rank" | "permissions">): RoleRecord {
	return {
		id: partial.slug,
		name: partial.slug,
		description: "",
		isSystem: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...partial,
	}
}

function target(partial: Partial<UserRecord> = {}): UserRecord {
	return {
		id: "target-1",
		name: "Target",
		email: "target@example.com",
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

describe("canAssignRole", () => {
	it("never allows assigning owner / super_admin", () => {
		const actor = sessionUser({
			roleRank: 100,
			permissions: ["system:admin"],
			grants: [grant("system", "admin")],
		})
		expect(
			canAssignRole(
				actor,
				role({ slug: "super_admin", rank: 100, permissions: ["system:admin"] }),
			),
		).toBe(false)
	})

	it("blocks assigning roles at or above the actor", () => {
		const actor = sessionUser({ roleRank: 80 })
		expect(canAssignRole(actor, role({ slug: "admin", rank: 80, permissions: [] }))).toBe(false)
		expect(canAssignRole(actor, role({ slug: "operator", rank: 50, permissions: [] }))).toBe(true)
	})
})

describe("canManageUser", () => {
	it("never allows self-management", () => {
		const actor = sessionUser({ id: "same" })
		expect(canManageUser(actor, target({ id: "same", roleRank: 1 }))).toBe(false)
	})

	it("blocks managing peers or seniors by rank", () => {
		const actor = sessionUser({ roleRank: 50 })
		expect(canManageUser(actor, target({ roleRank: 50 }))).toBe(false)
		expect(canManageUser(actor, target({ roleRank: 80 }))).toBe(false)
		expect(canManageUser(actor, target({ roleRank: 10 }))).toBe(true)
	})

	it("blocks managing users outside the actor organization", () => {
		const actor = sessionUser({
			roleRank: 80,
			orgSlug: "bear-and-berry",
			activeOrgSlug: "bear-and-berry",
			accessibleOrgs: [{ id: "org-bnb-id", slug: "bear-and-berry", name: "Bear & Berry", tags: [] }],
			grants: [grant("users", "edit", { org: "bear-and-berry" })],
		})
		expect(
			canManageUser(
				actor,
				target({
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

	it("canSeeTeamMember follows manage rules except for self", () => {
		const actor = sessionUser({ id: "me", roleRank: 80 })
		expect(canSeeTeamMember(actor, target({ id: "me" }))).toBe(true)
		expect(canSeeTeamMember(actor, target({ id: "other", roleRank: 10 }))).toBe(true)
	})
})
