import { getEnv } from "@/lib/env"

type SendMailInput = {
	to: string
	subject: string
	text: string
	html?: string
}

type Transporter = {
	sendMail: (options: {
		from: string
		to: string
		subject: string
		text: string
		html?: string
	}) => Promise<unknown>
}

let transporterPromise: Promise<Transporter | null> | null = null

async function getTransporter(): Promise<Transporter | null> {
	if (transporterPromise) {
		return transporterPromise
	}

	transporterPromise = (async () => {
		const env = getEnv()
		if (!env.SMTP_EMAIL || !env.SMTP_PASSWORD) {
			return null
		}
		const nodemailer = await import("nodemailer")
		return nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_PORT === 465,
			auth: {
				user: env.SMTP_EMAIL,
				pass: env.SMTP_PASSWORD,
			},
		}) as Transporter
	})()

	return transporterPromise
}

export async function sendMail(input: SendMailInput): Promise<boolean> {
	const env = getEnv()
	const transporter = await getTransporter()
	if (!transporter || !env.SMTP_EMAIL) {
		console.info(`[mail:skipped] ${input.subject} -> ${input.to}\n${input.text}`)
		return false
	}

	await transporter.sendMail({
		from: `Bear & Berry <${env.SMTP_EMAIL}>`,
		to: input.to,
		subject: input.subject,
		text: input.text,
		html: input.html,
	})
	return true
}
