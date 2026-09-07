import type { ReactNode } from "react"
import { hasDashboardAccess } from "@/lib/auth/access"
import { redirectTo } from "@/lib/auth/next-path"
import { getSessionUser, hasSessionCookie } from "@/lib/auth/session"
import { getAppEnvironment } from "@/lib/env"
import { Topbar } from "@/components/layout/topbar"
import type { Permission, SessionUser } from "@/types/domain"
import { hasPermission } from "@/lib/auth/rbac"
import { ORGANIZATION_ROOT, organizationPath } from "@/lib/auth/workspace"

type PageShellProps = {
	title: string
	subtitle: string
	permission: Permission
	children: ReactNode
}

export async function PageShell({ title, subtitle, permission, children }: PageShellProps) {
	const user = await getSessionUser()
	if (!user) {
		redirectTo((await hasSessionCookie()) ? "/apis/auth/logout" : "/login")
	}
	if (!hasDashboardAccess(user.accessStatus)) {
		redirectTo("/waitlist")
	}
	if (!hasPermission(user, permission)) {
		redirectTo(user.activeOrgSlug ? organizationPath(user.activeOrgSlug) : user.canAccessAdmin ? "/admin" : ORGANIZATION_ROOT)
	}

	const workspace = user.activeOrgSlug ? "org" : "admin"

	return (
		<>
			<Topbar
				title={title}
				subtitle={subtitle}
				user={user}
				environment={getAppEnvironment()}
				workspace={workspace}
			/>
			<div className="px-8 pt-8 md:px-10">{children}</div>
		</>
	)
}

export async function getDashboardUser(): Promise<SessionUser> {
	const user = await getSessionUser()
	if (!user) {
		redirectTo((await hasSessionCookie()) ? "/apis/auth/logout" : "/login")
	}
	if (!hasDashboardAccess(user.accessStatus)) {
		redirectTo("/waitlist")
	}
	return user
}
