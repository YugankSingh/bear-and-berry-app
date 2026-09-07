import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { EmailGateForm } from "@/components/auth/email-gate-form"
import { LoginForm } from "@/components/auth/login-form"
import { safeNextPath } from "@/lib/auth/next-path"

export const metadata: Metadata = {
	title: "Operator access",
}

type LoginPageProps = {
	searchParams: Promise<{ next?: string; email?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const params = await searchParams
	const nextPath = safeNextPath(params.next)
	const email = params.email?.trim().toLowerCase() ?? ""

	if (!email) {
		return (
			<AuthShell
				badge="Operator access"
				title={
					<>
						Start with
						<br />
						your email.
					</>
				}
				subtitle="We'll check if you already have an account. New operators can request access and join the waitlist."
			>
				<EmailGateForm nextPath={nextPath} />
			</AuthShell>
		)
	}

	return (
		<AuthShell
			badge="Welcome back"
			title={
				<>
					Enter your
					<br />
					password.
				</>
			}
			subtitle="Sign in to continue. If you have not been invited yet, you'll land on the waitlist."
		>
			<LoginForm email={email} nextPath={nextPath} />
		</AuthShell>
	)
}
