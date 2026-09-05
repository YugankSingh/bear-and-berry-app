import { ensureDatabaseReady } from "../lib/seed"

async function main(): Promise<void> {
	await ensureDatabaseReady()
	console.log("Database, organizations, and demo content are ready.")
	console.log("Sign in with SEED_ADMIN_EMAIL and your real password to create the first admin.")
}

void main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})