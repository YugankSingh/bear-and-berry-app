declare namespace NodeJS {
	interface ProcessEnv {
		APP_ENV?: "development" | "staging" | "production"
		AUTH_URL?: string
		AUTH_SECRET?: string
		SESSION_TTL_DAYS?: string
		MONGODB_URI?: string
		MONGODB_DB_NAME?: string
		LEADS_INGEST_API_KEY?: string
		CORS_ORIGINS?: string
		SEED_ADMIN_NAME?: string
		SEED_ADMIN_EMAIL?: string
		SEED_ADMIN_PASSWORD?: string
		SEED_DEMO_DATA?: string
		SMTP_EMAIL?: string
		SMTP_PASSWORD?: string
		SMTP_HOST?: string
		SMTP_PORT?: string
		SMTP_TEAM_RECIPIENTS?: string
	}
}
