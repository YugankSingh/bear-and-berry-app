import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignupForm } from "@/components/auth/signup-form"
import { safeNextPath } from "@/lib/auth/next-path"

export const metadata: Metadata = {
	title: "Request access",
}

type SignupPageProps = {
	searchParams: Promise<{ next?: string; email?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
	const params = await searchParams
	const email = params.email?.trim().toLowerCase() ?? ""
	if (!email) {
		redirect("/login")
	}

	return (
		<AuthShell
			badge="Request access"
			title={
				<>
					Create your
					<br />
					account.
				</>
			}
			subtitle="Create a password, then verify your email with a one-time code. We'll add you to the waitlist until someone invites you."
		>
			<SignupForm email={email} nextPath={safeNextPath(params.next)} />
		</AuthShell>
	)
}
