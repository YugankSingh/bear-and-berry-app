import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { LeadsTable } from "@/components/leads/leads-table"
import { LeadRecipientsCard } from "@/components/leads/lead-recipients-card"
import { listLeads } from "@/lib/repositories/leads"
import { listLeadRecipients } from "@/lib/repositories/lead-recipients"
import { hasPermission } from "@/lib/auth/rbac"

export const metadata: Metadata = {
	title: "Leads",
}

export default async function LeadsPage() {
	const user = await getDashboardUser()
	const canNotify = hasPermission(user, "leads:notify")
	let leads = [] as Awaited<ReturnType<typeof listLeads>>
	let recipients = [] as Awaited<ReturnType<typeof listLeadRecipients>>
	try {
		;[leads, recipients] = await Promise.all([
			listLeads(),
			canNotify ? listLeadRecipients() : Promise.resolve([]),
		])
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Leads"
			subtitle="Inbound unit, proposal, and admin requests from the landing page."
			permission="leads:read"
		>
			{canNotify ? <LeadRecipientsCard recipients={recipients} /> : null}
			{leads.length === 0 ? (
				<EmptyState
					title="No leads yet"
					body="POST the landing-page contact payload to /apis/leads and it will land here."
				/>
			) : (
				<LeadsTable leads={leads} canWrite={hasPermission(user, "leads:write")} />
			)}
		</PageShell>
	)
}
