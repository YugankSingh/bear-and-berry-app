import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { redirectTo } from "@/lib/auth/next-path"
import { getSessionUser, hasSessionCookie } from "@/lib/auth/session"

export const metadata: Metadata = {
	title: "Waitlist",
}

export const dynamic = "force-dynamic"

export default async function WaitlistPage() {
	const user = await getSessionUser()
	if (!user) {
		redirectTo((await hasSessionCookie()) ? "/apis/auth/logout" : "/login")
	}

	return (
		<AuthShell
			badge="Waitlist"
			title={
				<>
					Your interest
					<br />
					is registered.
				</>
			}
			subtitle="You've been added to the operator waitlist. We'll reach out when your invitation is ready."
		>
			<div className="space-y-5">
				<div className="rounded-2xl bg-[#F8F6F2] px-5 py-4">
					<p className="text-[13px] font-medium text-[#1A1A1A]">{user.name}</p>
					<p className="mt-1 text-[13px] text-[#8C8C8C]">{user.email}</p>
				</div>
				<p className="text-[14px] leading-[1.75] text-[#8C8C8C]">
					The Bear & Berry operator dashboard is limited to invited partners and internal
					operators. You can sign back in anytime — if you still have not been invited, you'll
					return here.
				</p>
				<SignOutButton />
			</div>
		</AuthShell>
	)
}
