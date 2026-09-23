import { after } from "next/server"
import { getSelfUrl } from "@/lib/env"
import { ingestKeyHeaders } from "@/lib/leads/ingest-key"
import { notifyLeadIngest } from "@/lib/leads/notify"
import type { LeadRecord } from "@/types/domain"

async function triggerNotifyCall(leadId: string): Promise<boolean> {
	const response = await fetch(`${getSelfUrl()}/apis/leads/notify`, {
		method: "POST",
		headers: ingestKeyHeaders(),
		body: JSON.stringify({ leadId }),
	})
	return response.ok
}

export function scheduleLeadNotify(lead: LeadRecord): void {
	after(async () => {
		try {
			const sent = await triggerNotifyCall(lead.id)
			if (!sent) {
				await notifyLeadIngest(lead)
			}
		} catch (error) {
			console.error("lead notify trigger failed", error)
			try {
				await notifyLeadIngest(lead)
			} catch (fallbackError) {
				console.error("lead notify fallback failed", fallbackError)
			}
		}
	})
}
