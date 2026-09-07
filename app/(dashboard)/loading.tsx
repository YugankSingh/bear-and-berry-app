export default function DashboardLoading() {
	return (
		<div
			className="flex min-h-[40vh] flex-col items-center justify-center"
			role="status"
			aria-live="polite"
			aria-label="Loading"
		>
			<div className="relative h-9 w-9">
				<span className="absolute inset-0 rounded-full border-2 border-[#1A1A1A]/8" />
				<span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#BD0C16]" />
			</div>
			<p className="mt-4 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
				Loading
			</p>
		</div>
	)
}
