import { z } from "zod"
import { APP_ENVIRONMENTS, type AppEnvironment } from "@/types/domain"

const envSchema = z.object({
	APP_ENV: z.enum(APP_ENVIRONMENTS).default("development"),
	SELF_URL: z.string().url().optional(),
	LANDING_URL: z.string().url().optional(),
	LANDING_KEY: z.string().min(8).optional(),
	AUTH_SECRET: z.string().min(32).optional(),
	SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
	INVITE_TTL_DAYS: z.coerce.number().int().positive().default(7),
	MONGODB_URI: z.string().min(1).optional(),
	SEED_ADMIN_EMAIL: z.string().email().optional(),
	SMTP_EMAIL: z.string().optional(),
	SMTP_PASSWORD: z.string().optional(),
	SMTP_HOST: z.string().default("smtpout.secureserver.net"),
	SMTP_PORT: z.coerce.number().int().positive().default(465),
})

export type AppEnv = z.infer<typeof envSchema> & {
	APP_ENV: AppEnvironment
}

const DATABASE_BY_ENV: Record<AppEnvironment, string> = {
	development: "bear_and_berry_staging",
	staging: "bear_and_berry_staging",
	production: "bear_and_berry_prod",
}

let cached: AppEnv | null = null

function emptyToUndefined(value: string | undefined): string | undefined {
	if (!value || value.trim().length === 0) {
		return undefined
	}
	return value
}

export function getEnv(): AppEnv {
	if (cached) {
		return cached
	}

	const parsed = envSchema.safeParse({
		APP_ENV: process.env.APP_ENV,
		SELF_URL: emptyToUndefined(process.env.SELF_URL),
		LANDING_URL: emptyToUndefined(process.env.LANDING_URL),
		LANDING_KEY: emptyToUndefined(process.env.LANDING_KEY),
		AUTH_SECRET: emptyToUndefined(process.env.AUTH_SECRET),
		SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
		INVITE_TTL_DAYS: process.env.INVITE_TTL_DAYS,
		MONGODB_URI: emptyToUndefined(process.env.MONGODB_URI),
		SEED_ADMIN_EMAIL: emptyToUndefined(process.env.SEED_ADMIN_EMAIL),
		SMTP_EMAIL: emptyToUndefined(process.env.SMTP_EMAIL),
		SMTP_PASSWORD: emptyToUndefined(process.env.SMTP_PASSWORD),
		SMTP_HOST: process.env.SMTP_HOST,
		SMTP_PORT: process.env.SMTP_PORT,
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
	return DATABASE_BY_ENV[getEnv().APP_ENV]
}

export function getSelfUrl(): string {
	return getEnv().SELF_URL ?? "http://localhost:3001"
}

export function getAppUrl(): string {
	return getSelfUrl()
}

export function getLandingUrl(): string {
	return getEnv().LANDING_URL ?? "http://localhost:3000"
}

export function getLandingKey(): string | undefined {
	return getEnv().LANDING_KEY
}

export function getInviteTtlDays(): number {
	return getEnv().INVITE_TTL_DAYS
}

export function getAuthSecret(): string {
	const secret = getEnv().AUTH_SECRET
	if (!secret) {
		throw new Error("AUTH_SECRET must be at least 32 characters")
	}
	return secret
}

function originFromUrl(value: string): string | null {
	try {
		return new URL(value).origin
	} catch {
		return null
	}
}

export function getCorsOrigins(): string[] {
	return [...new Set([originFromUrl(getSelfUrl()), originFromUrl(getLandingUrl())].filter((origin): origin is string => Boolean(origin)))]
}

export function getDeveloperDiagnostics(): {
	appEnv: AppEnvironment
	database: string
	selfUrl: string
	landingUrl: string
	sessionTtlDays: number
	inviteTtlDays: number
	smtpHost: string
	smtpPort: number
	smtpConfigured: boolean
	corsOrigins: string[]
} {
	const env = getEnv()
	return {
		appEnv: env.APP_ENV,
		database: getMongoDbName(),
		selfUrl: getSelfUrl(),
		landingUrl: getLandingUrl(),
		sessionTtlDays: env.SESSION_TTL_DAYS,
		inviteTtlDays: env.INVITE_TTL_DAYS,
		smtpHost: env.SMTP_HOST,
		smtpPort: env.SMTP_PORT,
		smtpConfigured: Boolean(env.SMTP_EMAIL && env.SMTP_PASSWORD),
		corsOrigins: getCorsOrigins(),
	}
}
