import type { ReactNode } from "react"
import { BrandLockup } from "@/components/brand/brand-lockup"

type AuthShellProps = {
	badge: string
	title: ReactNode
	subtitle: string
	children: ReactNode
}

export function AuthShell({ badge, title, subtitle, children }: AuthShellProps) {
	return (
		<div className="flex min-h-screen items-center justify-center px-6 py-16">
			<div className="w-full max-w-[440px] animate-fade-up">
				<div className="mb-10">
					<BrandLockup size="md" />
					<p className="mt-3 text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">Operator</p>
				</div>

				<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#ECEAE6] bg-[#1A1A1A]/[0.04] px-4 py-[9px]">
					<div className="h-[5px] w-[5px] rounded-full bg-[#BD0C16]" />
					<span className="text-[11px] font-medium uppercase tracking-[2px] text-[#1A1A1A]/40">
						{badge}
					</span>
				</div>

				<h1 className="mb-4 text-[44px] font-extrabold leading-[0.97] tracking-[-2.4px] text-[#1A1A1A]">
					{title}
				</h1>
				<p className="mb-10 text-[15px] leading-[1.85] text-[#8C8C8C]">{subtitle}</p>

				<div className="rounded-3xl bg-white p-7 card-shadow">{children}</div>
			</div>
		</div>
	)
}
