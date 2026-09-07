"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { authRedirectPath } from "@/lib/auth/next-path"

type VerifyOtpFormProps = {
	email: string
	nextPath: string
}

export function VerifyOtpForm({ email, nextPath }: VerifyOtpFormProps) {
	const [otp, setOtp] = useState("")
	const [error, setError] = useState("")
	const [info, setInfo] = useState("")
	const [loading, setLoading] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")
		setInfo("")

		try {
			const response = await fetch("/apis/auth/verify-otp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, otp }),
			})
			const payload = (await response.json()) as {
				ok: boolean
				error?: string
				data?: { accessStatus?: string }
			}

			if (!payload.ok) {
				setError(payload.error ?? "Unable to verify that code.")
				return
			}

			window.location.assign(authRedirectPath(payload.data?.accessStatus, nextPath))
		} catch {
			setError("Unable to verify right now.")
		} finally {
			setLoading(false)
		}
	}

	async function resend() {
		setError("")
		setInfo("")
		const response = await fetch("/apis/auth/resend-otp", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		if (!payload.ok) {
			setError(payload.error ?? "Could not send a new code.")
			return
		}
		setInfo("A new code is on its way.")
	}

	return (
		<form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
			<p className="text-[14px] text-[#8C8C8C]">
				We sent a 6-digit code to <span className="text-[#1A1A1A]">{email}</span>.
			</p>
			<label className="block">
				<span className="mb-2 block text-[11px] font-semibold uppercase tracking-[2px] text-[#8C8C8C]">
					Code
				</span>
				<input
					inputMode="numeric"
					pattern="\d{6}"
					required
					maxLength={6}
					value={otp}
					onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
					placeholder="000000"
					className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-5 py-[13px] text-[15px] tracking-[6px] text-[#1A1A1A] outline-none"
				/>
			</label>
			{error ? <p className="text-[13px] text-[#BD0C16]">{error}</p> : null}
			{info ? <p className="text-[13px] text-[#555555]">{info}</p> : null}
			<button
				type="submit"
				disabled={loading}
				className="mt-2 w-full rounded-2xl bg-[#BD0C16] py-[14px] text-[14px] font-medium text-white transition-colors hover:bg-[#a00a12] disabled:opacity-50"
			>
				{loading ? "Verifying…" : "Verify email"}
			</button>
			<p className="pt-1 text-center text-[13px] text-[#8C8C8C]">
				<button type="button" onClick={() => void resend()} className="underline-offset-2 hover:text-[#1A1A1A] hover:underline">
					Resend code
				</button>
				{" · "}
				<Link href="/login" className="underline-offset-2 hover:text-[#1A1A1A] hover:underline">
					Use a different email
				</Link>
			</p>
		</form>
	)
}
