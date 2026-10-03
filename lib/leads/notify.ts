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
	const border = last ? "" : "border-bottom: 1px solid #ECEAE6; "
	return `<tr><td style="padding: 10px 0; ${border}color: #8C8C8C; font-size: 12px; width: 160px;">${label}</td><td style="padding: 10px 0; ${border}font-size: 13px; color: #1A1A1A;">${value}</td></tr>`
}

function customerRow(label: string, value: string, last = false): string {
	const border = last ? "" : "border-bottom: 1px solid #ECEAE6; "
	return `<tr><td style="padding: 11px 0; ${border}color: #8C8C8C; font-size: 11px; width: 140px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">${label}</td><td style="padding: 11px 0; ${border}font-size: 14px; color: #1A1A1A; font-weight: 500;">${value}</td></tr>`
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
<div style="font-family: Georgia, 'Times New Roman', Times, serif; max-width: 540px; color: #1A1A1A;">
  <div style="background: #1A1A1A; border-radius: 16px 16px 0 0; padding: 22px 28px;">
    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: #BD0C16;">New lead</p>
    <h2 style="margin: 8px 0 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">${safeTitle}</h2>
  </div>
  <div style="background: #F8F6F2; border-radius: 0 0 16px 16px; padding: 24px 28px;">
    <p style="margin: 0 0 16px; font-family: Arial, Helvetica, sans-serif; color: #8C8C8C; font-size: 13px;">Received via <strong style="color: #1A1A1A;">bearandberry.in</strong></p>
    <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif;">
      ${teamRow("Intent", safeTitle)}
      ${teamRow("Name", safeName)}
      ${teamRow("Business / Org", htmlDisplay(lead.organization))}
      ${teamRow("Location & City", htmlDisplay(lead.location))}
      ${teamRow("Phone", htmlDisplay(lead.phone))}
      ${teamRow("Email", `<a href="mailto:${safeEmail}" style="color: #BD0C16; text-decoration: none; font-weight: 600;">${safeEmail}</a>`, true)}
    </table>
  </div>
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
			`Need to talk sooner? Call or WhatsApp us at +91 97608 58226.`,
			`Or reply to this email with any questions.`,
			``,
			`— The Bear & Berry Team`,
			`https://bearandberry.in`,
		].join("\n"),
		html: `
<div style="margin: 0; padding: 0; background: #F8F6F2;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #F8F6F2;">
    <tr>
      <td align="center" style="padding: 28px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px; border-collapse: separate;">
          <tr>
            <td style="background: #1A1A1A; border-radius: 20px 20px 0 0; padding: 32px 32px 28px;">
              <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #BD0C16;">Bear &amp; Berry</p>
              <h1 style="margin: 14px 0 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 32px; line-height: 1.1; font-weight: 800; letter-spacing: -1px; color: #ffffff;">Thanks for<br/>reaching out.</h1>
              <p style="margin: 14px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.72);">We've got your request and will be in touch shortly.</p>
            </td>
          </tr>
          <tr>
            <td style="height: 6px; background: #BD0C16; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background: #ffffff; padding: 32px;">
              <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color: #1A1A1A;">Hi <strong>${greeting}</strong>,</p>
              <p style="margin: 0 0 24px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color: #555555;">We've received your <strong style="color: #BD0C16;">${safeTitle}</strong> and our team will follow up soon with next steps, pricing, and rollout options for your space.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background: #F8F6F2; border-radius: 14px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <p style="margin: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #BD0C16;">Your submission</p>
                    <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif;">
                      ${customerRow("Request Type", safeTitle)}
                      ${customerRow("Name", safeName)}
                      ${customerRow("Business / Org", htmlDisplay(lead.organization))}
                      ${customerRow("Location", htmlDisplay(lead.location))}
                      ${customerRow("Phone", htmlDisplay(lead.phone), true)}
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 8px;">
                <tr>
                  <td style="background: #BD0C16; border-radius: 999px;">
                    <a href="tel:+919760858226" style="display: inline-block; padding: 14px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; color: #ffffff; text-decoration: none;">Call +91 97608 58226</a>
                  </td>
                  <td width="10" style="font-size: 0; line-height: 0;">&nbsp;</td>
                  <td style="background: #1A1A1A; border-radius: 999px;">
                    <a href="https://bearandberry.in" style="display: inline-block; padding: 14px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; color: #ffffff; text-decoration: none;">Explore Bear &amp; Berry</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: #8C8C8C;">Want to talk right away? Call or WhatsApp <a href="tel:+919760858226" style="color: #BD0C16; text-decoration: none; font-weight: 700;">+91 97608 58226</a>, or just reply to this email.</p>
              <p style="margin: 22px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1A1A1A; font-weight: 700;">— The Bear &amp; Berry Team</p>
            </td>
          </tr>
          <tr>
            <td style="background: #2D1C18; border-radius: 0 0 20px 20px; padding: 18px 32px;">
              <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: rgba(255,255,255,0.55);">
                <a href="tel:+919760858226" style="color: #ffffff; text-decoration: none; font-weight: 600;">+91 97608 58226</a>
                &nbsp;·&nbsp;
                <a href="https://bearandberry.in" style="color: #ffffff; text-decoration: none; font-weight: 600;">bearandberry.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`,
	})
}
