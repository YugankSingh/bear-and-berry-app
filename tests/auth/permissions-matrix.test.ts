import { describe, expect, it } from "vitest"
import { PERMISSIONS, type Permission } from "@/types/domain"
import {
	SUPER_ADMIN_ONLY_PERMISSIONS,
	canGrantAccessGrant,
	canGrantPermissions,
	grantablePermissions,
	hasAllOrganizations,
	hasPermission,
	isReservedPermission,
	sanitizeRolePermissions,
} from "@/lib/auth/permissions"
import { isOrgBoundPermission, isPlatformPermission, PERMISSION_SCOPE_SPEC } from "@/lib/auth/permission-scopes"
import { capabilityForPermission } from "@/lib/auth/compile-grants"
import { grant, sessionUser } from "../helpers/auth"
import { DEFAULT_ROLES } from "@/lib/auth/default-roles"

describe("permission catalog completeness", () => {
	it("every permission has scope metadata", () => {
		for (const permission of PERMISSIONS) {
			expect(PERMISSION_SCOPE_SPEC[permission]).toBeDefined()
			expect(isOrgBoundPermission(permission) || isPlatformPermission(permission)).toBe(true)
			expect(isOrgBoundPermission(permission) && isPlatformPermission(permission)).toBe(false)
		}
	})

	it("every permission maps to a capability except orgs:all (wildcard-only)", () => {
		for (const permission of PERMISSIONS) {
			if (permission === "orgs:all") {
				expect(capabilityForPermission(permission)).toBeNull()
				continue
			}
			expect(capabilityForPermission(permission)).toBeTruthy()
		}
	})

	it("reserved permissions are exactly the super-admin-only set", () => {
		for (const permission of PERMISSIONS) {
			expect(isReservedPermission(permission)).toBe(
				(SUPER_ADMIN_ONLY_PERMISSIONS as readonly Permission[]).includes(permission),
			)
		}
	})
})

describe("hasPermission matrix", () => {
	it("empty user has none", () => {
		for (const permission of PERMISSIONS) {
			expect(hasPermission(sessionUser({ permissions: [], grants: [] }), permission)).toBe(false)
		}
	})

	it("system:admin via permissions grants every permission", () => {
		const user = sessionUser({
			permissions: ["system:admin"],
			grants: [grant("system", "admin")],
		})
		for (const permission of PERMISSIONS) {
			expect(hasPermission(user, permission)).toBe(true)
		}
	})

	it("system:admin grant grants every permission", () => {
		const user = sessionUser({
			permissions: ["system:admin", "dashboard:read"],
			grants: [grant("system", "admin")],
			grantKeys: ["system=admin"],
		})
		for (const permission of PERMISSIONS) {
			expect(hasPermission(user, permission)).toBe(true)
		}
	})

	it("exact permission-only users (no grants) only get listed perms", () => {
		for (const permission of PERMISSIONS) {
			const user = sessionUser({ permissions: [permission], grants: [] })
			for (const candidate of PERMISSIONS) {
				expect(hasPermission(user, candidate)).toBe(candidate === permission || permission === "system:admin")
			}
		}
	})

	it("org-bound grant only works in the matching active org", () => {
		const orgBound = PERMISSIONS.filter(isOrgBoundPermission).filter((p) => p !== "orgs:all")
		for (const permission of orgBound) {
			const capability = capabilityForPermission(permission)!
			const user = sessionUser({
				permissions: [permission],
				grants: [grant(capability.resource, capability.action, { org: "bear-and-berry" })],
				activeOrgSlug: "bear-and-berry",
				accessibleOrgs: [
					{ id: "1", slug: "bear-and-berry", name: "B", tags: [] },
					{ id: "2", slug: "vendforge-labs", name: "V", tags: [] },
				],
			})
			expect(hasPermission(user, permission)).toBe(true)
			expect(hasPermission({ ...user, activeOrgSlug: "vendforge-labs" }, permission)).toBe(false)
		}
	})

	it("platform permissions ignore active org", () => {
		for (const permission of PERMISSIONS.filter(isPlatformPermission)) {
			if (permission === "system:admin" || permission === "orgs:all") continue
			const capability = capabilityForPermission(permission)!
			const user = sessionUser({
				permissions: [permission],
				grants: [grant(capability.resource, capability.action)],
				activeOrgSlug: "bear-and-berry",
			})
			expect(hasPermission(user, permission)).toBe(true)
			expect(hasPermission({ ...user, activeOrgSlug: "vendforge-labs" }, permission)).toBe(true)
			expect(hasPermission({ ...user, activeOrgSlug: "" }, permission)).toBe(true)
		}
	})

	it("orgs:all / hasAllOrganizations follows org wildcard grants", () => {
		const user = sessionUser({
			permissions: ["orgs:all"],
			grants: [grant("orgs", "view", { org: "*" })],
		})
		expect(hasPermission(user, "orgs:all")).toBe(true)
		expect(hasAllOrganizations(user)).toBe(true)
		expect(hasAllOrganizations(sessionUser({ permissions: [], grants: [] }))).toBe(false)
	})
})

describe("grantablePermissions / canGrantPermissions", () => {
	it("never includes reserved permissions for non-owners", () => {
		const actor = sessionUser({ permissions: [...PERMISSIONS], grants: [] })
		const grantable = grantablePermissions(actor)
		for (const reserved of SUPER_ADMIN_ONLY_PERMISSIONS) {
			expect(grantable).not.toContain(reserved)
		}
	})

	it("canGrantPermissions requires subset of grantable", () => {
		const actor = sessionUser({ permissions: ["machines:read", "users:grant"], grants: [] })
		expect(canGrantPermissions(actor, ["machines:read"])).toBe(true)
		expect(canGrantPermissions(actor, ["machines:write"])).toBe(false)
		expect(canGrantPermissions(actor, ["system:admin"])).toBe(false)
	})
})

describe("canGrantAccessGrant matrix", () => {
	it("blocks every reserved capability for org admins", () => {
		const actor = sessionUser({
			permissions: ["users:grant", "users:write", "machines:write"],
			grants: [
				grant("users", "grant", { org: "bear-and-berry" }),
				grant("machines", "edit", { org: "bear-and-berry" }),
			],
		})
		expect(canGrantAccessGrant(actor, grant("system", "admin"))).toBe(false)
		expect(canGrantAccessGrant(actor, grant("orgs", "view", { org: "*" }))).toBe(false)
		expect(canGrantAccessGrant(actor, grant("roles", "edit"))).toBe(false)
	})

	it("blocks org:* minting without actor org:*", () => {
		const actor = sessionUser({
			permissions: ["users:grant", "machines:write"],
			grants: [
				grant("users", "grant", { org: "bear-and-berry" }),
				grant("machines", "edit", { org: "bear-and-berry" }),
			],
		})
		expect(canGrantAccessGrant(actor, grant("machines", "edit", { org: "*" }))).toBe(false)
	})

	it("allows same-org grant of owned capability", () => {
		const actor = sessionUser({
			permissions: ["users:grant", "machines:write"],
			grants: [
				grant("users", "grant", { org: "bear-and-berry" }),
				grant("machines", "edit", { org: "bear-and-berry" }),
			],
			accessibleOrgs: [{ id: "1", slug: "bear-and-berry", name: "B", tags: ["fleet"] }],
		})
		expect(canGrantAccessGrant(actor, grant("machines", "edit", { org: "bear-and-berry" }))).toBe(true)
	})
})

describe("sanitizeRolePermissions", () => {
	it("strips reserved from non-owner roles", () => {
		const sanitized = sanitizeRolePermissions(
			{ slug: "admin", permissions: ["dashboard:read"] },
			["dashboard:read", "system:admin", "orgs:all", "roles:write", "machines:read"],
		)
		expect(sanitized).toEqual(["dashboard:read", "machines:read"])
	})

	it("forces reserved onto owner roles", () => {
		const sanitized = sanitizeRolePermissions(
			{ slug: "super_admin", permissions: ["system:admin"] },
			["dashboard:read"],
		)
		for (const reserved of SUPER_ADMIN_ONLY_PERMISSIONS) {
			expect(sanitized).toContain(reserved)
		}
	})
})

describe("default roles — platform leads isolation", () => {
	it("super_admin has every permission including leads", () => {
		const role = DEFAULT_ROLES.find((r) => r.slug === "super_admin")!
		for (const permission of PERMISSIONS) {
			expect(role.permissions).toContain(permission)
		}
	})

	it("admin/operator/viewer never include leads or other platform-only perms", () => {
		const platformOnly = [
			"leads:read",
			"leads:write",
			"leads:delete",
			"leads:notify",
			"cms:read",
			"cms:write",
			"settings:write",
			"system:admin",
			"orgs:all",
			"roles:write",
			"developer:read",
		] as const
		for (const slug of ["admin", "operator", "viewer"] as const) {
			const role = DEFAULT_ROLES.find((r) => r.slug === slug)!
			for (const permission of platformOnly) {
				expect(role.permissions).not.toContain(permission)
			}
		}
	})

	it("developer only has diagnostics permissions", () => {
		expect(DEFAULT_ROLES.find((r) => r.slug === "developer")!.permissions).toEqual([
			"dashboard:read",
			"settings:read",
			"developer:read",
		])
	})
})
