import type { Metadata } from "next"
import Link from "next/link"
import { AuthShell } from "@/components/auth/auth-shell"

export const metadata: Metadata = {
	title: "Access removed",
}

export default function AccessRemovedPage() {
	return (
		<AuthShell
			badge="Account"
			title={
				<>
					This account
					<br />
					was removed.
				</>
			}
			subtitle="An admin took this email off the operator dashboard. Ask them to send a new invitation if you still need access."
		>
			<Link href="/login" className="block text-center text-[14px] text-[#BD0C16]">
				Back to sign in
			</Link>
		</AuthShell>
	)
}
