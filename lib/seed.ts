import { ensureIndexes } from "@/lib/db/collections"
import { ensureRbacCatalog } from "@/lib/repositories/roles"
import { seedLeadRecipientsIfEmpty } from "@/lib/repositories/lead-recipients"
import { upsertOrganization } from "@/lib/repositories/organizations"
import { BEAR_AND_BERRY_SLUG, VENDFORGE_LABS_SLUG } from "@/lib/auth/scope"

let readyPromise: Promise<void> | null = null

export async function ensureDatabaseReady(): Promise<void> {
	if (process.env.NEXT_PHASE === "phase-production-build") {
		return
	}
	if (!readyPromise) {
		readyPromise = bootstrap().catch((error: unknown) => {
			readyPromise = null
			throw error
		})
	}
	return readyPromise
}

async function bootstrap(): Promise<void> {
	await ensureIndexes()
	await ensureRbacCatalog()
	await seedLeadRecipientsIfEmpty()
	await upsertOrganization({
		slug: BEAR_AND_BERRY_SLUG,
		name: "Bear & Berry",
		kind: "internal",
		tags: ["fleet"],
	})
	await upsertOrganization({
		slug: VENDFORGE_LABS_SLUG,
		name: "VendForge Labs",
		kind: "internal",
		tags: ["cms"],
	})
}
