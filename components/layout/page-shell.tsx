import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth/session"
import { getAppEnvironment } from "@/lib/env"
import { Topbar } from "@/components/layout/topbar"
import type { Permission, SessionUser } from "@/types/domain"
import { hasPermission } from "@/lib/auth/rbac"

type PageShellProps = {
	title: string
	subtitle: string
	permission: Permission
	children: ReactNode
}

export async function PageShell({ title, subtitle, permission, children }: PageShellProps) {
	const user = await getSessionUser()
	if (!user) {
		redirect("/login")
	}
	if (!hasPermission(user.role, permission)) {
		redirect("/overview")
	}

	return (
		<>
			<Topbar
				title={title}
				subtitle={subtitle}
				user={user}
				environment={getAppEnvironment()}
			/>
			<div className="px-8 pt-8 md:px-10">{children}</div>
		</>
	)
}

export async function getDashboardUser(): Promise<SessionUser> {
	const user = await getSessionUser()
	if (!user) {
		redirect("/login")
	}
	return user
}
