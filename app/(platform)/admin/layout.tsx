import { hasDashboardAccess } from "@/lib/auth/access"
import { redirectTo } from "@/lib/auth/next-path"
import { getSessionUser, hasSessionCookie } from "@/lib/auth/session"
import { visibleNavItems } from "@/lib/auth/rbac"
import { ORGANIZATION_ROOT } from "@/lib/auth/org-path"
import { ensureDatabaseReady } from "@/lib/seed"
import { getAppEnvironment } from "@/lib/env"
import { Sidebar } from "@/components/layout/sidebar"
import { ViewportLock } from "@/components/layout/viewport-lock"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
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
	if (!user.canAccessAdmin) {
		redirectTo(ORGANIZATION_ROOT)
	}

	return (
		<div className="flex h-dvh overflow-hidden bg-[#F8F6F2]">
			<ViewportLock />
			<Sidebar user={user} items={visibleNavItems(user, "admin")} workspace="admin" />
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<div className="hidden" data-environment={getAppEnvironment()} />
				<main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin pb-12">
					{children}
				</main>
			</div>
		</div>
	)
}
