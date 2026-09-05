import { z } from "zod"
import { APP_ENVIRONMENTS, type AppEnvironment } from "@/types/domain"

const envSchema = z.object({
	APP_ENV: z.enum(APP_ENVIRONMENTS).default("development"),
	AUTH_URL: z.string().url().optional(),
	AUTH_SECRET: z.string().min(32).optional(),
	SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
	MONGODB_URI: z.string().min(1).optional(),
	MONGODB_DB_NAME: z.string().min(1).optional(),
	LEADS_INGEST_API_KEY: z.string().min(8).optional(),
	CORS_ORIGINS: z.string().optional(),
	SEED_ADMIN_NAME: z.string().default("Bear & Berry Admin"),
	SEED_ADMIN_EMAIL: z.string().email().optional(),
	SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
	SEED_DEMO_DATA: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => value !== "false"),
	SMTP_EMAIL: z.string().optional(),
	SMTP_PASSWORD: z.string().optional(),
	SMTP_HOST: z.string().default("smtpout.secureserver.net"),
	SMTP_PORT: z.coerce.number().int().positive().default(465),
	SMTP_TEAM_RECIPIENTS: z.string().optional(),
})

export type AppEnv = z.infer<typeof envSchema> & {
	APP_ENV: AppEnvironment
}

// Local development and staging share one database for now.
// Production stays isolated.
const DATABASE_BY_ENV: Record<AppEnvironment, string> = {
	development: "bear_and_berry_staging",
	staging: "bear_and_berry_staging",
	production: "bear_and_berry_prod",
}

let cached: AppEnv | null = null

export function getEnv(): AppEnv {
	if (cached) {
		return cached
	}

	const emptyToUndefined = (value: string | undefined): string | undefined => {
		if (!value || value.trim().length === 0) {
			return undefined
		}
		return value
	}

	const parsed = envSchema.safeParse({
		APP_ENV: process.env.APP_ENV,
		AUTH_URL: emptyToUndefined(process.env.AUTH_URL),
		AUTH_SECRET: emptyToUndefined(process.env.AUTH_SECRET),
		SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
		MONGODB_URI: emptyToUndefined(process.env.MONGODB_URI),
		MONGODB_DB_NAME: emptyToUndefined(process.env.MONGODB_DB_NAME),
		LEADS_INGEST_API_KEY: emptyToUndefined(process.env.LEADS_INGEST_API_KEY),
		CORS_ORIGINS: emptyToUndefined(process.env.CORS_ORIGINS),
		SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME,
		SEED_ADMIN_EMAIL: emptyToUndefined(process.env.SEED_ADMIN_EMAIL),
		SEED_ADMIN_PASSWORD: emptyToUndefined(process.env.SEED_ADMIN_PASSWORD),
		SEED_DEMO_DATA: process.env.SEED_DEMO_DATA,
		SMTP_EMAIL: emptyToUndefined(process.env.SMTP_EMAIL),
		SMTP_PASSWORD: emptyToUndefined(process.env.SMTP_PASSWORD),
		SMTP_HOST: process.env.SMTP_HOST,
		SMTP_PORT: process.env.SMTP_PORT,
		SMTP_TEAM_RECIPIENTS: emptyToUndefined(process.env.SMTP_TEAM_RECIPIENTS),
	})

	if (!parsed.success) {
		throw new Error(`Invalid environment: ${parsed.error.message}`)
	}

	cached = parsed.data
	return cached
}

export function getAppEnvironment(): AppEnvironment {
	return getEnv().APP_ENV
}

export function isProductionLike(): boolean {
	const env = getAppEnvironment()
	return env === "staging" || env === "production"
}

export function getMongoUri(): string {
	const uri = getEnv().MONGODB_URI
	if (!uri) {
		throw new Error("MONGODB_URI is required")
	}
	return uri
}

export function getMongoDbName(): string {
	const env = getEnv()
	return env.MONGODB_DB_NAME ?? DATABASE_BY_ENV[env.APP_ENV]
}

export function getAuthSecret(): string {
	const secret = getEnv().AUTH_SECRET
	if (!secret) {
		throw new Error("AUTH_SECRET must be at least 32 characters")
	}
	return secret
}

export function getCorsOrigins(): string[] {
	const raw = getEnv().CORS_ORIGINS
	if (!raw) {
		return []
	}
	return raw
		.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0)
}

export function getTeamRecipients(): string[] {
	const raw = getEnv().SMTP_TEAM_RECIPIENTS
	if (!raw) {
		return ["yuganksingh05@gmail.com", "badbudarsingh@gmail.com"]
	}
	return raw
		.split(",")
		.map((email) => email.trim())
		.filter((email) => email.length > 0)
}