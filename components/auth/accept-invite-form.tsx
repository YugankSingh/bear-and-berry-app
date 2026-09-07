"use client"

import { useState, type FormEvent } from "react"
import { authRedirectPath } from "@/lib/auth/next-path"

type AcceptInviteFormProps = {
	token: string
	email: string
	needsPassword: boolean
}

export function AcceptInviteForm({ token, email, needsPassword }: AcceptInviteFormProps) {
	const [password, setPassword] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")

		try {
			const response = await fetch("/apis/auth/accept-invite", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token,
					password: needsPassword ? password : undefined,
				}),
			})
			const payload = (await response.json()) as {
				ok: boolean
				error?: string
				data?: { accessStatus?: string }
			}

			if (!payload.ok) {
				setError(payload.error ?? "Unable to accept this invitation.")
				return
			}

			window.location.assign(authRedirectPath(payload.data?.accessStatus, "/organization"))
		} catch {
			setError("Unable to accept this invitation right now.")
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
					readOnly
					value={email}
					className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-5 py-[13px] text-[15px] text-[#1A1A1A] outline-none"
				/>
			</label>
			{needsPassword ? (
				<label className="block">
					<span className="mb-2 block text-[11px] font-semibold uppercase tracking-[2px] text-[#8C8C8C]">
						Create a password
					</span>
					<input
						type="password"
						required
						minLength={8}
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						placeholder="At least 8 characters"
						className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-5 py-[13px] text-[15px] text-[#1A1A1A] outline-none"
					/>
				</label>
			) : (
				<p className="text-[14px] text-[#8C8C8C]">
					Your email is confirmed. Accept the invitation to open the dashboard with the password you
					already created.
				</p>
			)}
			{error ? <p className="text-[13px] text-[#BD0C16]">{error}</p> : null}
			<button
				type="submit"
				disabled={loading}
				className="mt-2 w-full rounded-2xl bg-[#BD0C16] py-[14px] text-[14px] font-medium text-white transition-colors hover:bg-[#a00a12] disabled:opacity-50"
			>
				{loading ? "Accepting…" : needsPassword ? "Set password and join" : "Accept invitation"}
			</button>
		</form>
	)
}
