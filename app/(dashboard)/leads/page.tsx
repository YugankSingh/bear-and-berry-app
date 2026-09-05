import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { LeadsTable } from "@/components/leads/leads-table"
import { listLeads } from "@/lib/repositories/leads"
import { hasPermission } from "@/lib/auth/rbac"

export const metadata: Metadata = {
	title: "Leads",
}

export default async function LeadsPage() {
	const user = await getDashboardUser()
	let leads = [] as Awaited<ReturnType<typeof listLeads>>
	try {
		leads = await listLeads()
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Leads"
			subtitle="Inbound unit, proposal, and admin requests from the landing page."
			permission="leads:read"
		>
			{leads.length === 0 ? (
				<EmptyState
					title="No leads yet"
					body="POST the landing-page contact payload to /apis/leads and it will land here."
				/>
			) : (
				<LeadsTable leads={leads} canWrite={hasPermission(user.role, "leads:write")} />
			)}
		</PageShell>
	)
}
