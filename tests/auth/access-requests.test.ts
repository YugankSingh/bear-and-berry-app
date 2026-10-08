import { describe, expect, it } from "vitest"
import { DEFAULT_ROLES } from "@/lib/auth/default-roles"
import { capabilityForPermission, compileGrants, permissionsFromGrants } from "@/lib/auth/compile-grants"
import { isPlatformPermission } from "@/lib/auth/permission-scopes"
import { canAccessAdminWorkspace } from "@/lib/auth/workspace"
import type { Permission } from "@/types/domain"

const SIGNUP_PERMISSIONS: Permission[] = ["signups:read", "signups:approve", "signups:reject"]

describe("access request permissions", () => {
	it("are platform permissions, not org-bound", () => {
		for (const permission of SIGNUP_PERMISSIONS) {
			expect(isPlatformPermission(permission)).toBe(true)
		}
	})

	it("are not given to any default role except super admin", () => {
		for (const role of DEFAULT_ROLES.filter((item) => item.slug !== "super_admin")) {
			for (const permission of SIGNUP_PERMISSIONS) {
				expect(role.permissions).not.toContain(permission)
			}
		}
	})

	it("round-trip through grants independently", () => {
		for (const permission of SIGNUP_PERMISSIONS) {
			const grants = compileGrants({
				role: { slug: "reviewer", permissions: [permission] },
				memberships: [],
			})
			expect(permissionsFromGrants(grants)).toEqual([permission])
			expect(capabilityForPermission(permission)?.resource).toBe("signups")
		}
	})

	it("viewing requests opens the admin workspace", () => {
		const grants = compileGrants({ role: { slug: "reviewer", permissions: ["signups:read"] }, memberships: [] })
		expect(canAccessAdminWorkspace({ grants, permissions: permissionsFromGrants(grants) })).toBe(true)
	})

	it("a user with no role compiles to no grants", () => {
		expect(compileGrants({ role: null, memberships: [] })).toEqual([])
	})
})
