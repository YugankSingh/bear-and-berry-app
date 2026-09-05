import { getEnv, getTeamRecipients } from "@/lib/env"
import { intentTitle } from "@/lib/validations/lead"
import type { LeadRecord } from "@/types/domain"

export async function notifyLeadIngest(lead: LeadRecord): Promise<void> {
	const env = getEnv()
	if (!env.SMTP_EMAIL || !env.SMTP_PASSWORD) {
		return
	}

	try {
		const nodemailer = await import("nodemailer").catch(() => null)
		if (!nodemailer) {
			return
		}

		const transporter = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_PORT === 465,
			auth: {
				user: env.SMTP_EMAIL,
				pass: env.SMTP_PASSWORD,
			},
		})

		const title = intentTitle(lead.intent)
		const recipients = getTeamRecipients()

		await transporter.sendMail({
			from: `Bear & Berry <${env.SMTP_EMAIL}>`,
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
	} catch (error) {
		console.error("lead notify failed", error)
	}
}
