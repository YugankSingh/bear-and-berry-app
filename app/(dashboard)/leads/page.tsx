import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { LeadsPanel } from "@/components/leads/leads-panel"
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
	let activeLeads = [] as Awaited<ReturnType<typeof listLeads>>
	let archivedLeads = [] as Awaited<ReturnType<typeof listLeads>>
	let recipients = [] as Awaited<ReturnType<typeof listLeadRecipients>>
	try {
		;[activeLeads, archivedLeads, recipients] = await Promise.all([
			listLeads({ archived: false }),
			listLeads({ archived: true }),
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
			<LeadsPanel
				activeLeads={activeLeads}
				archivedLeads={archivedLeads}
				canWrite={hasPermission(user, "leads:write")}
			/>
		</PageShell>
	)
}
