"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { formatDateTime, titleCase } from "@/lib/format"
import type { LeadIntent, LeadRecord, LeadStatus } from "@/types/domain"

const INTENT_TONE: Record<LeadIntent, "berry" | "brown" | "dark"> = {
	unit: "berry",
	proposal: "brown",
	admin: "dark",
}

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "closed"]

type LeadsTableProps = {
	leads: LeadRecord[]
	canWrite: boolean
}

export function LeadsTable({ leads, canWrite }: LeadsTableProps) {
	const router = useRouter()

	async function updateStatus(id: string, status: LeadStatus) {
		await fetch(`/apis/leads/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status }),
		})
		router.refresh()
	}

	return (
		<div className="overflow-hidden rounded-3xl bg-white card-shadow">
			<table className="w-full text-left">
				<thead>
					<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
						<th className="px-6 py-4 font-semibold">Lead</th>
						<th className="px-6 py-4 font-semibold">Intent</th>
						<th className="px-6 py-4 font-semibold">Site</th>
						<th className="px-6 py-4 font-semibold">Status</th>
						<th className="px-6 py-4 font-semibold">Received</th>
					</tr>
				</thead>
				<tbody>
					{leads.map((lead) => (
						<tr key={lead.id} className="border-b border-[#ECEAE6] last:border-0">
							<td className="px-6 py-5">
								<p className="text-[14px] font-medium text-[#1A1A1A]">{lead.name ?? "Unnamed"}</p>
								<p className="mt-1 text-[13px] text-[#8C8C8C]">{lead.email}</p>
								{lead.organization ? (
									<p className="mt-1 text-[12px] text-[#8C8C8C]">{lead.organization}</p>
								) : null}
							</td>
							<td className="px-6 py-5">
								<Badge tone={INTENT_TONE[lead.intent]}>{titleCase(lead.intent)}</Badge>
							</td>
							<td className="px-6 py-5 text-[13px] text-[#555555]">
								<p>{lead.location ?? "—"}</p>
								<p className="mt-1 text-[#8C8C8C]">{lead.footfall ?? lead.timeline ?? "—"}</p>
							</td>
							<td className="px-6 py-5">
								{canWrite ? (
									<select
										value={lead.status}
										onChange={(event) => void updateStatus(lead.id, event.target.value as LeadStatus)}
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
							</td>
							<td className="px-6 py-5 text-[13px] text-[#8C8C8C]">{formatDateTime(lead.createdAt)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
