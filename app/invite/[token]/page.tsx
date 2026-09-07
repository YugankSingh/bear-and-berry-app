import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { AcceptInviteForm } from "@/components/auth/accept-invite-form"
import { resolveInviteState } from "@/lib/auth/access"
import { hashSecret } from "@/lib/auth/tokens"
import { findUserByInviteTokenHash } from "@/lib/repositories/users"
import { ensureDatabaseReady } from "@/lib/seed"
import Link from "next/link"

export const metadata: Metadata = {
	title: "Accept invitation",
}

type InvitePageProps = {
	params: Promise<{ token: string }>
}

export default async function InviteAcceptPage({ params }: InvitePageProps) {
	const { token } = await params
	try {
		await ensureDatabaseReady()
	} catch {
		// page can still render an error state
	}

	const user = await findUserByInviteTokenHash(hashSecret(token)).catch(() => null)
	const inviteState = user ? resolveInviteState(user) : "none"

	if (!user || inviteState === "none" || inviteState === "accepted") {
		return (
			<AuthShell
				badge="Invitation"
				title={
					<>
						This link is
						<br />
						not valid.
					</>
				}
				subtitle="Ask an admin to send a fresh invitation to your email."
			>
				<Link href="/login" className="block text-center text-[14px] text-[#BD0C16]">
					Back to sign in
				</Link>
			</AuthShell>
		)
	}

	if (inviteState === "expired") {
		return (
			<AuthShell
				badge="Invitation"
				title={
					<>
						This invite
						<br />
						has expired.
					</>
				}
				subtitle="Ask an admin on the Team page to send a new invitation."
			>
				<Link href="/login" className="block text-center text-[14px] text-[#BD0C16]">
					Back to sign in
				</Link>
			</AuthShell>
		)
	}

	return (
		<AuthShell
			badge="Invitation"
			title={
				<>
					Join Bear
					<br />
					& Berry.
				</>
			}
			subtitle="Confirm this email and choose the password you'll use from now on."
		>
			<AcceptInviteForm
				token={token}
				email={user.email}
				needsPassword={user.passwordReady === false}
			/>
		</AuthShell>
	)
}
