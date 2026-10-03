import { hasDashboardAccess } from "@/lib/auth/access"
import { redirectTo } from "@/lib/auth/next-path"
import { getSessionUser, hasSessionCookie } from "@/lib/auth/session"
import { ViewportLock } from "@/components/layout/viewport-lock"

export const dynamic = "force-dynamic"

export default async function OrganizationPickerLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const user = await getSessionUser()
	if (!user) {
		redirectTo((await hasSessionCookie()) ? "/apis/auth/logout" : "/login")
	}
	if (!hasDashboardAccess(user.accessStatus)) {
		redirectTo("/waitlist")
	}

	return (
		<div className="min-h-dvh bg-[#F8F6F2]">
			<ViewportLock />
			{children}
		</div>
	)
}
