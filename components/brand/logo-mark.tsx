type LogoMarkProps = {
	className?: string
}

export function LogoMark({ className }: LogoMarkProps) {
	return (
		<svg
			viewBox="0 0 48 48"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<rect width="48" height="48" rx="14" fill="#BD0C16" />
			<path
				d="M15 31.5c2.4-6.8 6.1-11.8 9-14.6 2.9 2.8 6.6 7.8 9 14.6"
				stroke="white"
				strokeWidth="2.4"
				strokeLinecap="round"
			/>
			<circle cx="24" cy="16" r="2.4" fill="white" />
		</svg>
	)
}
