import { getEnv } from "@/lib/env"

type SendMailInput = {
	to: string
	subject: string
	text: string
}

export async function sendMail(input: SendMailInput): Promise<boolean> {
	const env = getEnv()
	if (!env.SMTP_EMAIL || !env.SMTP_PASSWORD) {
		console.info(`[mail:skipped] ${input.subject} -> ${input.to}\n${input.text}`)
		return false
	}

	const nodemailer = await import("nodemailer")
	const transporter = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		secure: env.SMTP_PORT === 465,
		auth: {
			user: env.SMTP_EMAIL,
			pass: env.SMTP_PASSWORD,
		},
	})

	await transporter.sendMail({
		from: `Bear & Berry <${env.SMTP_EMAIL}>`,
		to: input.to,
		subject: input.subject,
		text: input.text,
	})
	return true
}
