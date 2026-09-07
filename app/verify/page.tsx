import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { VerifyOtpForm } from "@/components/auth/verify-otp-form"
import { redirectTo, safeNextPath } from "@/lib/auth/next-path"

export const metadata: Metadata = {
	title: "Verify email",
}

type VerifyPageProps = {
	searchParams: Promise<{ email?: string; next?: string }>
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
	const params = await searchParams
	const email = params.email?.trim().toLowerCase() ?? ""
	if (!email) {
		redirectTo("/login")
	}

	return (
		<AuthShell
			badge="Verify email"
			title={
				<>
					Check your
					<br />
					inbox.
				</>
			}
			subtitle="Enter the code we sent so we know this email belongs to you."
		>
			<VerifyOtpForm email={email} nextPath={safeNextPath(params.next)} />
		</AuthShell>
	)
}
