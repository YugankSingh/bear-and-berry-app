import type { AccessGrant } from "@/lib/auth/grants"
import type { SessionUser } from "@/types/domain"
import { fillRequiredWildcards } from "@/lib/auth/grants"

export function grant(
	resource: AccessGrant["resource"],
	action: AccessGrant["action"],
	scopes: Partial<Omit<AccessGrant, "resource" | "action">> = {},
): AccessGrant {
	return fillRequiredWildcards({
		resource,
		action,
		org: scopes.org ?? null,
		orgTag: scopes.orgTag ?? null,
		tag: scopes.tag ?? null,
		location: scopes.location ?? null,
		id: scopes.id ?? null,
	})
}

export function sessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
	return {
		id: "actor-1",
		name: "Actor",
		email: "actor@example.com",
		role: "admin",
		roleName: "Admin",
		roleRank: 80,
		orgId: "org-home-id",
		orgSlug: "bear-and-berry",
		scopePath: "/bear-and-berry",
		tags: [],
		accessStatus: "invited",
		resourceAccess: {
			mode: "all",
			organizationSlugs: [],
			organizationTags: [],
			locationIds: [],
			machineIds: [],
			machineTags: [],
		},
		memberships: [{ org: "bear-and-berry", orgTag: null, role: "admin" }],
		extraPermissions: [],
		extraGrants: [],
		grants: [],
		grantKeys: [],
		permissions: ["dashboard:read", "users:read", "users:write", "machines:read", "machines:write"],
		accessibleOrgs: [
			{ id: "org-bnb-id", slug: "bear-and-berry", name: "Bear & Berry", tags: ["fleet"] },
			{ id: "org-vf-id", slug: "vendforge-labs", name: "VendForge Labs", tags: ["cms"] },
		],
		activeOrgSlug: "bear-and-berry",
		canAccessAdmin: false,
		...overrides,
	}
}
