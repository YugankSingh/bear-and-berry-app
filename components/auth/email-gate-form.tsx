"use client"

import { useState, type FormEvent } from "react"
import type { AuthNext } from "@/lib/auth/lookup"

type EmailGateFormProps = {
	nextPath: string
}

function destination(next: AuthNext, params: URLSearchParams): string {
	if (next === "signup") return `/signup?${params}`
	if (next === "verify") return `/verify?${params}`
	if (next === "invite_pending") return `/invite/sent?${params}`
	if (next === "invite_expired") return `/invite/expired?${params}`
	if (next === "removed") return `/access-removed?${params}`
	return `/login?${params}`
}

export function EmailGateForm({ nextPath }: EmailGateFormProps) {
	const [email, setEmail] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")

		try {
			const response = await fetch("/apis/auth/lookup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			})
			const payload = (await response.json()) as {
				ok: boolean
				error?: string
				data?: { next?: AuthNext; email?: string }
			}

			if (!payload.ok || !payload.data?.next) {
				setError(payload.error ?? "Unable to continue.")
				return
			}

			const params = new URLSearchParams()
			params.set("email", payload.data.email ?? email.trim().toLowerCase())
			if (nextPath !== "/organization") {
				params.set("next", nextPath)
			}

			window.location.assign(destination(payload.data.next, params))
		} catch {
			setError("Unable to continue right now.")
		} finally {
			setLoading(false)
		}
	}

	return (
		<form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
			<label className="block">
				<span className="mb-2 block text-[11px] font-semibold uppercase tracking-[2px] text-[#8C8C8C]">
					Email
				</span>
				<input
					type="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="you@bearandberry.in"
					className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-5 py-[13px] text-[15px] text-[#1A1A1A] outline-none placeholder:text-[#8C8C8C]/55 focus:border-[#1A1A1A]/30"
				/>
			</label>
			{error ? <p className="text-[13px] text-[#BD0C16]">{error}</p> : null}
			<button
				type="submit"
				disabled={loading}
				className="mt-2 w-full rounded-2xl bg-[#BD0C16] py-[14px] text-[14px] font-medium text-white transition-colors hover:bg-[#a00a12] disabled:opacity-50"
			>
				{loading ? "Checking…" : "Continue"}
			</button>
		</form>
	)
}
