"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type ResendInviteButtonProps = {
	userId: string
}

export function ResendInviteButton({ userId }: ResendInviteButtonProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	async function resend() {
		setLoading(true)
		setError("")
		const response = await fetch(`/apis/users/${userId}/invite`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not resend the invitation.")
			return
		}
		router.refresh()
	}

	return (
		<div>
			<button
				type="button"
				disabled={loading}
				onClick={() => void resend()}
				className="rounded-full border border-[#ECEAE6] px-4 py-2 text-[12px] text-[#1A1A1A] hover:bg-white disabled:opacity-50"
			>
				{loading ? "Sending…" : "Resend invite"}
			</button>
			{error ? <p className="mt-2 text-[12px] text-[#BD0C16]">{error}</p> : null}
		</div>
	)
}
