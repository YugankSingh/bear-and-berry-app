import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth/session"
import { visibleNavItems } from "@/lib/auth/rbac"
import { ensureBootstrap } from "@/lib/seed"
import { getAppEnvironment } from "@/lib/env"
import { Sidebar } from "@/components/layout/sidebar"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	try {
		await ensureBootstrap()
	} catch (error) {
		console.error("bootstrap failed", error)
	}

	const user = await getSessionUser()
	if (!user) {
		redirect("/login")
	}

	return (
		<div className="flex min-h-screen bg-[#F8F6F2]">
			<Sidebar user={user} items={visibleNavItems(user.role)} />
			<div className="flex min-w-0 flex-1 flex-col">
				<div className="hidden" data-environment={getAppEnvironment()} />
				<main className="flex-1 overflow-y-auto scrollbar-thin pb-12">{children}</main>
			</div>
		</div>
	)
}
