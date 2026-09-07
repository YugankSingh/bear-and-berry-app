import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"

export const metadata: Metadata = {
	title: "Invitation sent",
}

type InviteSentPageProps = {
	searchParams: Promise<{ email?: string }>
}

export default async function InviteSentPage({ searchParams }: InviteSentPageProps) {
	const params = await searchParams
	const email = params.email?.trim().toLowerCase()

	return (
		<AuthShell
			badge="Invitation"
			title={
				<>
					Check your
					<br />
					email.
				</>
			}
			subtitle={
				email
					? `We sent an invitation to ${email}. Open that link to confirm your email and set your password.`
					: "We sent an invitation to your email. Open that link to confirm and finish setup."
			}
		>
			<p className="text-[14px] leading-[1.75] text-[#8C8C8C]">
				The link expires after a few days. If you cannot find it, ask an admin to resend the
				invitation.
			</p>
			<Link href="/login" className="mt-6 block text-center text-[14px] text-[#BD0C16]">
				Back to sign in
			</Link>
		</AuthShell>
	)
}
