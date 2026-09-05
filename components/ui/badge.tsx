import type { ReactNode } from "react"

type BadgeTone = "neutral" | "berry" | "dark" | "brown" | "success" | "warn" | "danger"

const TONES: Record<BadgeTone, string> = {
	neutral: "bg-[#1A1A1A]/[0.04] text-[#1A1A1A]/55 border-[#ECEAE6]",
	berry: "bg-[#BD0C16]/10 text-[#BD0C16] border-[#BD0C16]/15",
	dark: "bg-[#1A1A1A] text-white border-[#1A1A1A]",
	brown: "bg-[#2D1C18] text-white/85 border-[#2D1C18]",
	success: "bg-[#1A1A1A]/[0.04] text-[#1A1A1A] border-[#ECEAE6]",
	warn: "bg-[#2D1C18]/10 text-[#2D1C18] border-[#2D1C18]/10",
	danger: "bg-[#BD0C16]/10 text-[#BD0C16] border-[#BD0C16]/15",
}

type BadgeProps = {
	tone?: BadgeTone
	children: ReactNode
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.3px] ${TONES[tone]}`}
		>
			{children}
		</span>
	)
}
