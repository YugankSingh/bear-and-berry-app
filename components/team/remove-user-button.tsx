"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type RemoveUserButtonProps = {
	userId: string
	name: string
}

export function RemoveUserButton({ userId, name }: RemoveUserButtonProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	async function remove() {
		if (!window.confirm(`Remove ${name} from the team? They will lose access immediately.`)) {
			return
		}

		setLoading(true)
		setError("")
		const response = await fetch(`/apis/users/${userId}`, { method: "DELETE" })
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)

		if (!payload.ok) {
			setError(payload.error ?? "Could not remove that person.")
			return
		}

		router.refresh()
	}

	return (
		<div>
			<button
				type="button"
				disabled={loading}
				onClick={() => void remove()}
				className="rounded-full border border-[#BD0C16]/20 px-4 py-2 text-[12px] text-[#BD0C16] hover:bg-[#BD0C16]/5 disabled:opacity-50"
			>
				{loading ? "Removing…" : "Remove"}
			</button>
			{error ? <p className="mt-2 text-[12px] text-[#BD0C16]">{error}</p> : null}
		</div>
	)
}
