import { ensureDatabaseReady } from "../lib/seed"

async function main(): Promise<void> {
	await ensureDatabaseReady()
	console.log("Database, organizations, and RBAC catalog are ready.")
	console.log("Sign in with SEED_ADMIN_EMAIL and choose your own password to create the first admin.")
}

void main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})