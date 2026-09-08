import { sendMail } from "@/lib/mail/send"
import { listLeadRecipientEmails } from "@/lib/repositories/lead-recipients"
import { intentTitle } from "@/lib/validations/lead"
import type { LeadRecord } from "@/types/domain"

export async function notifyLeadIngest(lead: LeadRecord): Promise<void> {
	const title = intentTitle(lead.intent)
	const recipients = await listLeadRecipientEmails()

	if (recipients.length > 0) {
		await sendMail({
			to: recipients.join(", "),
			subject: `Bear & Berry — ${title} from ${lead.name ?? lead.email}`,
			text: [
				`New contact request stored in the operator app`,
				``,
				`Intent:            ${title}`,
				`Name:              ${lead.name ?? "—"}`,
				`Business / Org:    ${lead.organization ?? "—"}`,
				`Location & City:   ${lead.location ?? "—"}`,
				`Daily Footfall:    ${lead.footfall ?? "—"}`,
				`Phone:             ${lead.phone ?? "—"}`,
				`Timeline:          ${lead.timeline ?? "—"}`,
				`Operator Context:  ${lead.operatorContext ?? "—"}`,
				`Message:           ${lead.message ?? "—"}`,
				`Email:             ${lead.email}`,
			].join("\n"),
		})
	}

	await sendMail({
		to: lead.email,
		subject: "Thanks for reaching out — Bear & Berry",
		text: [
			`Hi ${lead.name ?? "there"},`,
			``,
			`Thanks for reaching out to Bear & Berry. We've received your request and will follow up shortly.`,
			`Request type: ${title}`,
			``,
			`Here's what you submitted:`,
			`  Business / Org:   ${lead.organization ?? "—"}`,
			`  Location & City:  ${lead.location ?? "—"}`,
			`  Daily Footfall:   ${lead.footfall ?? "—"}`,
			`  Message:          ${lead.message ?? "—"}`,
			``,
			`In the meantime, feel free to reply to this email with any questions.`,
			``,
			`— The Bear & Berry Team`,
		].join("\n"),
	})
}
