import { sendMail } from "@/lib/mail/send"
import { listLeadRecipientEmails } from "@/lib/repositories/lead-recipients"
import { intentTitle } from "@/lib/validations/lead"
import type { LeadRecord } from "@/types/domain"

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

function display(value: string | null | undefined): string {
	return value && value.trim().length > 0 ? value : "—"
}

function htmlDisplay(value: string | null | undefined): string {
	return escapeHtml(display(value))
}

function teamRow(label: string, value: string, last = false): string {
	const border = last ? "" : "border-bottom: 1px solid #eee; "
	return `<tr><td style="padding: 10px 0; ${border}color: #888; font-size: 12px; width: 160px;">${label}</td><td style="padding: 10px 0; ${border}font-size: 13px;">${value}</td></tr>`
}

function customerRow(label: string, value: string, last = false): string {
	const border = last ? "" : "border-bottom: 1px solid #e5e5e0; "
	return `<tr><td style="padding: 9px 0; ${border}color: #999; font-size: 11px; width: 150px; text-transform: uppercase; letter-spacing: 1px;">${label}</td><td style="padding: 9px 0; ${border}font-size: 13px;">${value}</td></tr>`
}

export async function notifyLeadIngest(lead: LeadRecord): Promise<void> {
	const title = intentTitle(lead.intent)
	const recipients = await listLeadRecipientEmails()
	const safeTitle = escapeHtml(title)
	const safeName = htmlDisplay(lead.name)
	const safeEmail = escapeHtml(lead.email)
	const greeting = escapeHtml(lead.name?.trim() ? lead.name : "there")

	if (recipients.length > 0) {
		await sendMail({
			to: recipients.join(", "),
			subject: `Bear & Berry — ${title} from ${lead.name ?? lead.email}`,
			text: [
				`New contact request received via bearandberry.in`,
				``,
				`Intent:            ${title}`,
				`Name:              ${display(lead.name)}`,
				`Business / Org:    ${display(lead.organization)}`,
				`Location & City:   ${display(lead.location)}`,
				`Phone:             ${display(lead.phone)}`,
				`Email:             ${lead.email}`,
			].join("\n"),
			html: `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 540px; color: #1a1a1a;">
  <h2 style="margin-bottom: 4px;">${safeTitle}</h2>
  <p style="color: #666; margin-top: 0;">Received via <strong>bearandberry.in</strong></p>
  <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse: collapse; margin-top: 20px;">
    ${teamRow("Intent", safeTitle)}
    ${teamRow("Name", safeName)}
    ${teamRow("Business / Org", htmlDisplay(lead.organization))}
    ${teamRow("Location & City", htmlDisplay(lead.location))}
    ${teamRow("Phone", htmlDisplay(lead.phone))}
    ${teamRow("Email", `<a href="mailto:${safeEmail}" style="color: #667ed6;">${safeEmail}</a>`, true)}
  </table>
</div>`,
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
			`  Name:             ${display(lead.name)}`,
			`  Business / Org:   ${display(lead.organization)}`,
			`  Location & City:  ${display(lead.location)}`,
			`  Phone:            ${display(lead.phone)}`,
			``,
			`In the meantime, feel free to reply to this email with any questions.`,
			``,
			`— The Bear & Berry Team`,
		].join("\n"),
		html: `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 540px; color: #1a1a1a;">
  <div style="background: #ddee3d; border-radius: 12px 12px 0 0; padding: 28px 32px 22px;">
    <p style="margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: rgba(0,0,0,0.4);">Bear & Berry</p>
    <h1 style="margin: 8px 0 0; font-size: 26px; font-weight: 900; letter-spacing: -1px; color: #1a1a1a;">Thanks for reaching out.</h1>
  </div>
  <div style="background: #f7f7f2; border-radius: 0 0 12px 12px; padding: 28px 32px;">
    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.7; color: #444;">Hi <strong>${greeting}</strong>,</p>
    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #444;">We've received your <strong>${safeTitle}</strong> and will follow up soon with the relevant details.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse: collapse; margin-bottom: 24px;">
      ${customerRow("Request Type", safeTitle)}
      ${customerRow("Name", safeName)}
      ${customerRow("Business / Org", htmlDisplay(lead.organization))}
      ${customerRow("Location", htmlDisplay(lead.location))}
      ${customerRow("Phone", htmlDisplay(lead.phone), true)}
    </table>
    <p style="margin: 0 0 6px; font-size: 13px; color: #888; line-height: 1.6;">Feel free to reply to this email with any questions.<br/>We're excited to work with you.</p>
    <p style="margin: 20px 0 0; font-size: 13px; color: #444; font-weight: 600;">— The Bear & Berry Team</p>
  </div>
</div>`,
	})
}
