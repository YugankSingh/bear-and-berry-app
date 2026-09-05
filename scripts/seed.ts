import { ensureBootstrap } from "../lib/seed"

async function main(): Promise<void> {
	await ensureBootstrap()
	console.log("Bootstrap complete.")
}

void main().catch((error: unknown) => {
	console.error(error)
	process.exit(1)
})
