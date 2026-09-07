import { headers } from "next/headers"
import { hasDashboardAccess } from "@/lib/auth/access"
import { redirectTo } from "@/lib/auth/next-path"
import { getSessionUser, hasSessionCookie } from "@/lib/auth/session"
import { ORGANIZATION_ROOT, PATH_HEADER, organizationPath } from "@/lib/auth/workspace"
import { ensureDatabaseReady } from "@/lib/seed"

export const dynamic = "force-dynamic"

const ADMIN_REDIRECTS: Record<string, string> = {
	"/developer": "/admin/developer",
	"/leads": "/admin/leads",
	"/cms/blog": "/admin/cms/blog",
}

const ORG_PAGES = ["/overview", "/machines", "/locations", "/inventory", "/revenue", "/team", "/settings"]

export default async function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	try {
		await ensureDatabaseReady()
	} catch (error) {
		console.error("bootstrap failed", error)
	}

	const user = await getSessionUser()
	if (!user) {
		redirectTo((await hasSessionCookie()) ? "/apis/auth/logout" : "/login")
	}
	if (!hasDashboardAccess(user.accessStatus)) {
		redirectTo("/waitlist")
	}

	const pathname = (await headers()).get(PATH_HEADER) ?? ""
	for (const [from, to] of Object.entries(ADMIN_REDIRECTS)) {
		if (pathname === from || pathname.startsWith(`${from}/`)) {
			redirectTo(`${to}${pathname.slice(from.length)}`)
		}
	}
	const orgPage = ORG_PAGES.find((page) => pathname === page || pathname.startsWith(`${page}/`))
	if (orgPage) {
		redirectTo(user.activeOrgSlug ? organizationPath(user.activeOrgSlug, pathname) : ORGANIZATION_ROOT)
	}

	return children
}
