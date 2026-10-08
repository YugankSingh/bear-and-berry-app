"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type RejectAccessButtonProps = {
	userId: string
	name: string
}

export function RejectAccessButton({ userId, name }: RejectAccessButtonProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	async function reject() {
		if (!window.confirm(`Reject ${name}'s access request?`)) {
			return
		}

		setLoading(true)
		setError("")
		const response = await fetch(`/apis/access-requests/${userId}/reject`, { method: "POST" })
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)

		if (!payload.ok) {
			setError(payload.error ?? "Could not reject that request.")
			return
		}

		router.refresh()
	}

	return (
		<div>
			<button
				type="button"
				disabled={loading}
				onClick={() => void reject()}
				className="rounded-full border border-[#BD0C16]/20 px-4 py-2 text-[12px] text-[#BD0C16] hover:bg-[#BD0C16]/5 disabled:opacity-50"
			>
				{loading ? "Rejecting…" : "Reject"}
			</button>
			{error ? <p className="mt-2 text-[12px] text-[#BD0C16]">{error}</p> : null}
		</div>
	)
}
