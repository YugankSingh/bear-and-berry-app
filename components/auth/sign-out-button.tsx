"use client"

type SignOutButtonProps = {
	label?: string
}

export function SignOutButton({ label = "Sign out" }: SignOutButtonProps) {
	async function signOut() {
		await fetch("/apis/auth/logout", { method: "POST" })
		window.location.assign("/login")
	}

	return (
		<button
			type="button"
			onClick={() => void signOut()}
			className="w-full rounded-2xl border border-[#ECEAE6] py-[14px] text-[14px] font-medium text-[#1A1A1A]/70 transition-colors hover:text-[#1A1A1A]"
		>
			{label}
		</button>
	)
}
