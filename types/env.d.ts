declare namespace NodeJS {
	interface ProcessEnv {
		APP_ENV?: "development" | "staging" | "production"
		SELF_URL?: string
		LANDING_URL?: string
		LANDING_KEY?: string
		AUTH_SECRET?: string
		SESSION_TTL_DAYS?: string
		INVITE_TTL_DAYS?: string
		MONGODB_URI?: string
		SEED_ADMIN_EMAIL?: string
		SMTP_EMAIL?: string
		SMTP_PASSWORD?: string
		SMTP_HOST?: string
		SMTP_PORT?: string
	}
}
