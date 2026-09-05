"use client"

import { useState, type FormEvent } from "react"

type LoginFormProps = {
	nextPath: string
}

export function LoginForm({ nextPath }: LoginFormProps) {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")

		try {
			const response = await fetch("/apis/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			})
			const payload = (await response.json()) as { ok: boolean; error?: string }

			if (!payload.ok) {
				setError(payload.error ?? "Unable to sign in.")
				return
			}

			window.location.assign(nextPath)
		} catch {
			setError("Unable to sign in right now.")
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
			<label className="block">
				<span className="mb-2 block text-[11px] font-semibold uppercase tracking-[2px] text-[#8C8C8C]">
					Password
				</span>
				<input
					type="password"
					required
					minLength={8}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					placeholder="Your invitation password"
					className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-5 py-[13px] text-[15px] text-[#1A1A1A] outline-none placeholder:text-[#8C8C8C]/55 focus:border-[#1A1A1A]/30"
				/>
			</label>
			{error ? <p className="text-[13px] text-[#BD0C16]">{error}</p> : null}
			<button
				type="submit"
				disabled={loading}
				className="mt-2 w-full rounded-2xl bg-[#BD0C16] py-[14px] text-[14px] font-medium text-white transition-colors hover:bg-[#a00a12] disabled:opacity-50"
			>
				{loading ? "Signing in…" : "Enter dashboard"}
			</button>
		</form>
	)
}
