import { getAppUrl, getInviteTtlDays } from "@/lib/env"
import { sendMail } from "@/lib/mail/send"

export async function sendInviteEmail(input: {
	to: string
	name: string
	token: string
}): Promise<boolean> {
	const days = getInviteTtlDays()
	const url = `${getAppUrl()}/invite/${input.token}`
	return sendMail({
		to: input.to,
		subject: "You're invited to Bear & Berry Operator",
		text: [
			`Hi ${input.name},`,
			``,
			`You've been invited to the Bear & Berry operator dashboard.`,
			`Open this link to confirm your email and set your password:`,
			``,
			url,
			``,
			`This invitation expires in ${days} day${days === 1 ? "" : "s"}.`,
			`If you were not expecting this, you can ignore the email.`,
		].join("\n"),
	})
}

export async function sendSignupOtpEmail(input: { to: string; name: string; otp: string }): Promise<boolean> {
	return sendMail({
		to: input.to,
		subject: "Your Bear & Berry verification code",
		text: [
			`Hi ${input.name},`,
			``,
			`Your verification code is ${input.otp}.`,
			`It expires in 15 minutes.`,
			``,
			`If you did not create an account, you can ignore this email.`,
		].join("\n"),
	})
}
