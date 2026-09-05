type EmptyStateProps = {
	title: string
	body: string
}

export function EmptyState({ title, body }: EmptyStateProps) {
	return (
		<div className="rounded-3xl bg-white card-shadow px-8 py-16 text-center">
			<div className="mx-auto mb-6 h-2 w-2 rounded-full bg-[#BD0C16]" />
			<h3 className="text-[22px] font-extrabold tracking-[-1px] text-[#1A1A1A]">{title}</h3>
			<p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.8] text-[#8C8C8C]">{body}</p>
		</div>
	)
}
