import { cookies } from "next/headers"
import { hasAnyCapability, hasOrgWildcard, type AccessGrant, type AccessibleOrg } from "@/lib/auth/grants"
import type { Permission, SessionUser } from "@/types/domain"
import {
	ADMIN_WORKSPACE,
	ORGANIZATION_ROOT,
	WORKSPACE_COOKIE,
} from "@/lib/auth/org-path"

export {
	ADMIN_WORKSPACE,
	ORGANIZATION_ROOT,
	ORG_HEADER,
	PATH_HEADER,
	WORKSPACE_COOKIE,
	organizationPageFromPath,
	organizationPath,
	parseOrganizationPath,
	swapOrganizationInPath,
} from "@/lib/auth/org-path"

export const ADMIN_NAV = [
	{ href: "/admin", label: "Overview", permission: "dashboard:read" as Permission },
	{ href: "/admin/organizations", label: "Organizations", permission: "orgs:all" as Permission },
	{ href: "/admin/team", label: "Team", permission: "users:read" as Permission },
	{ href: "/admin/roles", label: "Roles", permission: "roles:read" as Permission },
	{ href: "/admin/leads", label: "Leads", permission: "leads:read" as Permission },
	{ href: "/admin/cms/blog", label: "Blog CMS", permission: "cms:read" as Permission },
	{ href: "/admin/developer", label: "Developer", permission: "developer:read" as Permission },
] as const

export const ORG_NAV = [
	{ href: "/overview", label: "Overview", permission: "dashboard:read" as Permission },
	{ href: "/machines", label: "Machines", permission: "machines:read" as Permission },
	{ href: "/locations", label: "Locations", permission: "locations:read" as Permission },
	{ href: "/inventory", label: "Inventory", permission: "inventory:read" as Permission },
	{ href: "/revenue", label: "Revenue", permission: "revenue:read" as Permission },
	{ href: "/team", label: "Team", permission: "users:read" as Permission },
	{ href: "/settings", label: "Settings", permission: "settings:read" as Permission },
] as const

export type WorkspaceKind = "admin" | "org" | "picker"

export function resolveAccessibleOrg(
	user: Pick<SessionUser, "accessibleOrgs" | "grants">,
	orgId: string,
): AccessibleOrg | null {
	return user.accessibleOrgs.find((org) => org.slug === orgId || org.id === orgId) ?? null
}

export function canAccessAdminWorkspace(user: {
	grants?: AccessGrant[]
	permissions?: readonly string[]
}): boolean {
	if (hasOrgWildcard(user.grants) || hasAnyCapability(user.grants, "system", "admin")) {
		return true
	}
	return (
		hasAnyCapability(user.grants, "developer", "view") ||
		hasAnyCapability(user.grants, "cms", "view") ||
		hasAnyCapability(user.grants, "roles", "edit") ||
		Boolean(user.permissions?.includes("system:admin")) ||
		Boolean(user.permissions?.includes("orgs:all")) ||
		Boolean(user.permissions?.includes("developer:read")) ||
		Boolean(user.permissions?.includes("cms:read")) ||
		Boolean(user.permissions?.includes("roles:write"))
	)
}

export function canUseOrganization(
	user: Pick<SessionUser, "accessibleOrgs" | "grants">,
	slug: string,
): boolean {
	if (user.accessibleOrgs.some((org) => org.slug === slug || org.id === slug)) {
		return true
	}
	return hasOrgWildcard(user.grants)
}

export function signedInHome(): string {
	return ORGANIZATION_ROOT
}

export function applyWorkspaceCookie(
	user: SessionUser,
	workspace: string | undefined,
): SessionUser {
	if (!workspace) {
		return user
	}
	if (workspace === ADMIN_WORKSPACE) {
		if (!user.canAccessAdmin) {
			return user
		}
		return { ...user, activeOrgSlug: "" }
	}
	if (!canUseOrganization(user, workspace)) {
		return user
	}
	const org = user.accessibleOrgs.find((item) => item.slug === workspace || item.id === workspace)
	if (!org && !hasOrgWildcard(user.grants)) {
		return user
	}
	return {
		...user,
		activeOrgSlug: org?.slug ?? workspace,
		orgSlug: org?.slug ?? workspace,
	}
}

export async function readWorkspaceCookie(): Promise<string | undefined> {
	const store = await cookies()
	return store.get(WORKSPACE_COOKIE)?.value
}

export function defaultWorkspace(user: {
	canAccessAdmin: boolean
	accessibleOrgs: AccessibleOrg[]
	orgSlug: string
}): string {
	if (user.canAccessAdmin) {
		return ADMIN_WORKSPACE
	}
	return user.accessibleOrgs[0]?.slug ?? user.orgSlug
}
