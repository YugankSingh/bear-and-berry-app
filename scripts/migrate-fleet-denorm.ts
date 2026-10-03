/**
 * Backfills orgSlug on machines/locations and machineName on inventory slots.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/migrate-fleet-denorm.ts
 */
import { backfillFleetDenorm } from "../lib/db/backfill-fleet"

async function main() {
	const stats = await backfillFleetDenorm()
	console.log(JSON.stringify(stats, null, 2))
}

main()
	.then(() => process.exit(0))
	.catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
