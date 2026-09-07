export const WORKSPACE_COOKIE = "bb_workspace"
export const ADMIN_WORKSPACE = "admin"
export const ORGANIZATION_ROOT = "/organization"
export const ORG_HEADER = "x-bb-org"
export const PATH_HEADER = "x-bb-path"

export function organizationPath(orgId: string, page = "/overview"): string {
	const suffix = page.startsWith("/") ? page : `/${page}`
	return `${ORGANIZATION_ROOT}/${orgId}${suffix}`
}

export function organizationPageFromPath(pathname: string): string {
	const parsed = parseOrganizationPath(pathname)
	if (!parsed) {
		return "/overview"
	}
	return parsed.rest || "/overview"
}

export function parseOrganizationPath(pathname: string): { orgId: string; rest: string } | null {
	if (!pathname.startsWith(`${ORGANIZATION_ROOT}/`)) {
		return null
	}
	const rest = pathname.slice(ORGANIZATION_ROOT.length + 1)
	const slash = rest.indexOf("/")
	if (slash <= 0) {
		return rest ? { orgId: rest, rest: "/overview" } : null
	}
	const orgId = rest.slice(0, slash)
	const page = rest.slice(slash) || "/overview"
	return orgId ? { orgId, rest: page } : null
}

export function swapOrganizationInPath(pathname: string, orgId: string): string {
	const parsed = parseOrganizationPath(pathname)
	return organizationPath(orgId, parsed?.rest ?? "/overview")
}
