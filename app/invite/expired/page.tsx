import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"

export const metadata: Metadata = {
	title: "Invitation expired",
}

export default function InviteExpiredPage() {
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
			subtitle="Ask an admin to send a new invitation from the Team page. Your email stays the same."
		>
			<Link href="/login" className="block text-center text-[14px] text-[#BD0C16]">
				Back to sign in
			</Link>
		</AuthShell>
	)
}
