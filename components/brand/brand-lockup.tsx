import Image from "next/image"

type BrandLockupProps = {
	size?: "sm" | "md"
}

const SIZES = {
	sm: {
		bear: { width: 36, height: 36, className: "h-9 w-auto" },
		wordmark: { width: 112, height: 36, className: "h-8 w-auto" },
	},
	md: {
		bear: { width: 48, height: 48, className: "h-12 w-auto" },
		wordmark: { width: 148, height: 48, className: "h-11 w-auto" },
	},
} as const

export function BrandLockup({ size = "md" }: BrandLockupProps) {
	const dimensions = SIZES[size]

	return (
		<div className="flex items-center gap-2.5">
			<Image
				src="/bear-logo-clear.png"
				alt=""
				width={dimensions.bear.width}
				height={dimensions.bear.height}
				className={dimensions.bear.className}
				priority
			/>
			<Image
				src="/text-logo-clear.png"
				alt="Bear & Berry"
				width={dimensions.wordmark.width}
				height={dimensions.wordmark.height}
				className={dimensions.wordmark.className}
				priority
			/>
		</div>
	)
}
