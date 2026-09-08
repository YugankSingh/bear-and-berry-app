import { loadEnvConfig } from "@next/env"

export const REQUIRED_ENV = [
	"APP_ENV",
	"SELF_URL",
	"LANDING_URL",
	"SMTP_EMAIL",
	"LANDING_KEY",
	"AUTH_SECRET",
	"MONGODB_URI",
	"SMTP_PASSWORD",
] as const

function present(name: string): string | undefined {
	const value = process.env[name]?.trim()
	return value && value.length > 0 ? value : undefined
}

export function assertRequiredEnv(dir = process.cwd()): void {
	loadEnvConfig(dir)

	const missing = REQUIRED_ENV.filter((name) => !present(name))
	const invalid: string[] = []

	const authSecret = present("AUTH_SECRET")
	if (authSecret && authSecret.length < 32) {
		invalid.push("AUTH_SECRET (must be at least 32 characters)")
	}

	const landingKey = present("LANDING_KEY")
	if (landingKey && landingKey.length < 8) {
		invalid.push("LANDING_KEY (must be at least 8 characters)")
	}

	if (missing.length === 0 && invalid.length === 0) {
		return
	}

	const lines = [
		"Missing or invalid environment variables:",
		...missing.map((name) => `  - ${name} is missing`),
		...invalid.map((name) => `  - ${name}`),
	]
	throw new Error(lines.join("\n"))
}
