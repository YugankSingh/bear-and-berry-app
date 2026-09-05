import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { BrandLockup } from "@/components/brand/brand-lockup"

export const metadata: Metadata = {
	title: "Operator access",
}

type LoginPageProps = {
	searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const params = await searchParams
	const nextPath = params.next && params.next.startsWith("/") ? params.next : "/overview"

	return (
		<div className="flex min-h-screen items-center justify-center px-6 py-16">
			<div className="w-full max-w-[440px] animate-fade-up">
				<div className="mb-10">
					<BrandLockup size="md" />
					<p className="mt-3 text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">Operator</p>
				</div>

				<div className="inline-flex items-center gap-2 rounded-full border border-[#ECEAE6] bg-[#1A1A1A]/[0.04] px-4 py-[9px] mb-8">
					<div className="h-[5px] w-[5px] rounded-full bg-[#BD0C16]" />
					<span className="text-[11px] font-medium uppercase tracking-[2px] text-[#1A1A1A]/40">
						Invitation only
					</span>
				</div>

				<h1 className="mb-4 text-[44px] font-extrabold leading-[0.97] tracking-[-2.4px] text-[#1A1A1A]">
					Access is by
					<br />
					invitation only.
				</h1>
				<p className="mb-10 text-[15px] leading-[1.85] text-[#8C8C8C]">
					The Bear & Berry operator dashboard is restricted to verified partners and internal
					operators.
				</p>

				<div className="rounded-3xl bg-white p-7 card-shadow">
					<LoginForm nextPath={nextPath} />
				</div>
			</div>
		</div>
	)
}
