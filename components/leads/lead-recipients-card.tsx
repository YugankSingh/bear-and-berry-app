"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import type { LeadRecipientRecord } from "@/types/domain"

type LeadRecipientsCardProps = {
	recipients: LeadRecipientRecord[]
}

export function LeadRecipientsCard({ recipients }: LeadRecipientsCardProps) {
	const router = useRouter()
	const [email, setEmail] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	async function addRecipient(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")
		const response = await fetch("/apis/leads/recipients", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not add that email.")
			return
		}
		setEmail("")
		router.refresh()
	}

	async function removeRecipient(id: string) {
		setLoading(true)
		setError("")
		const response = await fetch(`/apis/leads/recipients/${id}`, { method: "DELETE" })
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not remove that email.")
			return
		}
		router.refresh()
	}

	return (
		<section className="mb-6 rounded-3xl bg-white p-6 card-shadow">
			<p className="text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
				Notification emails
			</p>
			<p className="mt-2 text-[13px] leading-[1.6] text-[#8C8C8C]">
				New landing-page leads are emailed to this list. Tags can be added later.
			</p>
			<ul className="mt-4 space-y-2">
				{recipients.length === 0 ? (
					<li className="text-[13px] text-[#8C8C8C]">No notification emails yet.</li>
				) : (
					recipients.map((recipient) => (
						<li key={recipient.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8F6F2] px-4 py-3">
							<span className="text-[14px] text-[#1A1A1A]">{recipient.email}</span>
							<button
								type="button"
								disabled={loading}
								onClick={() => void removeRecipient(recipient.id)}
								className="text-[12px] text-[#8C8C8C] hover:text-[#BD0C16] disabled:opacity-50"
							>
								Remove
							</button>
						</li>
					))
				)}
			</ul>
			<form onSubmit={(event) => void addRecipient(event)} className="mt-4 flex flex-wrap gap-2">
				<input
					required
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="name@bearandberry.in"
					className="min-w-[220px] flex-1 rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
				/>
				<button
					type="submit"
					disabled={loading}
					className="rounded-full bg-[#BD0C16] px-5 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50"
				>
					{loading ? "Saving…" : "Add email"}
				</button>
			</form>
			{error ? <p className="mt-3 text-[13px] text-[#BD0C16]">{error}</p> : null}
		</section>
	)
}
