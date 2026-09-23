"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDateTime, titleCase } from "@/lib/format"
import type { LeadIntent, LeadRecord, LeadStatus } from "@/types/domain"

const INTENT_TONE: Record<LeadIntent, "berry" | "brown" | "dark"> = {
	unit: "berry",
	proposal: "brown",
	admin: "dark",
}

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "closed"]

type LeadsPanelProps = {
	activeLeads: LeadRecord[]
	archivedLeads: LeadRecord[]
	canWrite: boolean
}

export function LeadsPanel({ activeLeads, archivedLeads, canWrite }: LeadsPanelProps) {
	const [view, setView] = useState<"inbox" | "archived">("inbox")
	const leads = view === "inbox" ? activeLeads : archivedLeads

	return (
		<div>
			<div className="mb-6 flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => setView("inbox")}
					className={`rounded-full px-5 py-[11px] text-[13px] font-medium transition-colors ${
						view === "inbox"
							? "bg-[#1A1A1A] text-white"
							: "bg-white text-[#1A1A1A]/60 card-shadow hover:text-[#1A1A1A]"
					}`}
				>
					Inbox
					<span className="ml-2 text-[12px] opacity-70">{activeLeads.length}</span>
				</button>
				<button
					type="button"
					onClick={() => setView("archived")}
					className={`rounded-full px-5 py-[11px] text-[13px] font-medium transition-colors ${
						view === "archived"
							? "bg-[#1A1A1A] text-white"
							: "bg-white text-[#1A1A1A]/60 card-shadow hover:text-[#1A1A1A]"
					}`}
				>
					Archived
					<span className="ml-2 text-[12px] opacity-70">{archivedLeads.length}</span>
				</button>
			</div>

			{leads.length === 0 ? (
				<EmptyState
					title={view === "archived" ? "Nothing archived" : "No leads yet"}
					body={
						view === "archived"
							? "Archived leads will appear here. They stay out of the inbox until you restore them."
							: "New landing-page requests will land here with name, email, phone, business, and location."
					}
				/>
			) : (
				<div className="space-y-4">
					{leads.map((lead) => (
						<LeadCard key={lead.id} lead={lead} canWrite={canWrite} />
					))}
				</div>
			)}
		</div>
	)
}

function LeadCard({ lead, canWrite }: { lead: LeadRecord; canWrite: boolean }) {
	const router = useRouter()
	const [comment, setComment] = useState("")
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState("")

	const details = [
		{ label: "Name", value: lead.name },
		{ label: "Email", value: lead.email },
		{ label: "Phone", value: lead.phone },
		{ label: "Business", value: lead.organization },
		{ label: "Location", value: lead.location },
		{ label: "Received", value: formatDateTime(lead.createdAt) },
	]

	const extras = [
		{ label: "Daily footfall", value: lead.footfall },
		{ label: "Timeline", value: lead.timeline },
		{ label: "Operator context", value: lead.operatorContext },
		{ label: "Message", value: lead.message },
	].filter((item) => item.value)

	async function patchLead(body: { status?: LeadStatus; archived?: boolean }) {
		setSaving(true)
		setError("")
		const response = await fetch(`/apis/leads/${lead.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setSaving(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not update this lead.")
			return
		}
		router.refresh()
	}

	async function addComment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!comment.trim()) {
			return
		}
		setSaving(true)
		setError("")
		const response = await fetch(`/apis/leads/${lead.id}/comments`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ body: comment }),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setSaving(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not add that comment.")
			return
		}
		setComment("")
		router.refresh()
	}

	return (
		<article className="rounded-3xl bg-white p-6 card-shadow">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="text-[16px] font-semibold text-[#1A1A1A]">{lead.name ?? "Unnamed"}</p>
					<p className="mt-1 text-[13px] text-[#8C8C8C]">{lead.email}</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge tone={INTENT_TONE[lead.intent]}>{titleCase(lead.intent)}</Badge>
					{canWrite ? (
						<select
							value={lead.status}
							disabled={saving}
							onChange={(event) => void patchLead({ status: event.target.value as LeadStatus })}
							className="rounded-full border border-[#ECEAE6] bg-[#F8F6F2] px-3 py-2 text-[12px] text-[#1A1A1A] outline-none"
						>
							{STATUSES.map((status) => (
								<option key={status} value={status}>
									{titleCase(status)}
								</option>
							))}
						</select>
					) : (
						<Badge>{titleCase(lead.status)}</Badge>
					)}
					{canWrite ? (
						<button
							type="button"
							disabled={saving}
							onClick={() => void patchLead({ archived: !lead.archivedAt })}
							className="rounded-full border border-[#ECEAE6] px-4 py-2 text-[12px] text-[#1A1A1A]/55 hover:text-[#1A1A1A] disabled:opacity-50"
						>
							{lead.archivedAt ? "Restore" : "Archive"}
						</button>
					) : null}
				</div>
			</div>

			<dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{details.map((item) => (
					<div key={item.label}>
						<dt className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#8C8C8C]">
							{item.label}
						</dt>
						<dd className="mt-1 text-[14px] text-[#1A1A1A]">{item.value || "—"}</dd>
					</div>
				))}
			</dl>

			{extras.length > 0 ? (
				<dl className="mt-4 grid gap-4 border-t border-[#ECEAE6] pt-4 sm:grid-cols-2">
					{extras.map((item) => (
						<div key={item.label}>
							<dt className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#8C8C8C]">
								{item.label}
							</dt>
							<dd className="mt-1 text-[14px] text-[#1A1A1A]">{item.value}</dd>
						</div>
					))}
				</dl>
			) : null}

			<div className="mt-6 border-t border-[#ECEAE6] pt-5">
				<p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#8C8C8C]">Comments</p>
				<ul className="mt-3 space-y-3">
					{lead.comments.length === 0 ? (
						<li className="text-[13px] text-[#8C8C8C]">No comments yet.</li>
					) : (
						lead.comments.map((item) => (
							<li key={item.id} className="rounded-2xl bg-[#F8F6F2] px-4 py-3">
								<p className="text-[14px] leading-[1.6] text-[#1A1A1A]">{item.body}</p>
								<p className="mt-2 text-[12px] text-[#8C8C8C]">
									{item.authorName} · {formatDateTime(item.createdAt)}
								</p>
							</li>
						))
					)}
				</ul>
				{canWrite ? (
					<form onSubmit={(event) => void addComment(event)} className="mt-4 flex flex-col gap-2 sm:flex-row">
						<textarea
							value={comment}
							onChange={(event) => setComment(event.target.value)}
							placeholder="Add a comment for later"
							rows={2}
							className="min-h-[48px] flex-1 resize-none rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
						/>
						<button
							type="submit"
							disabled={saving || !comment.trim()}
							className="rounded-full bg-[#BD0C16] px-5 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50"
						>
							{saving ? "Saving…" : "Add comment"}
						</button>
					</form>
				) : null}
				{error ? <p className="mt-3 text-[13px] text-[#BD0C16]">{error}</p> : null}
			</div>
		</article>
	)
}
