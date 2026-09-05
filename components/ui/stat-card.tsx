type StatCardProps = {
	eyebrow: string
	value: string
	detail: string
	dark?: boolean
}

export function StatCard({ eyebrow, value, detail, dark = false }: StatCardProps) {
	return (
		<div
			className={`rounded-3xl p-6 ${
				dark
					? "bg-[#1A1A1A] text-white"
					: "bg-white card-shadow text-[#1A1A1A]"
			}`}
		>
			<p
				className={`text-[11px] font-semibold uppercase tracking-[3px] mb-5 ${
					dark ? "text-white/40" : "text-[#8C8C8C]"
				}`}
			>
				{eyebrow}
			</p>
			<p className="text-[40px] leading-none font-extrabold tracking-[-2px]">{value}</p>
			<p className={`mt-4 text-[13px] leading-relaxed ${dark ? "text-white/50" : "text-[#8C8C8C]"}`}>
				{detail}
			</p>
		</div>
	)
}
