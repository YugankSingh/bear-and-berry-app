import { ensureIndexes, inventoryCollection, locationsCollection, machinesCollection } from "@/lib/db/collections"
import { orgSlugFromPath } from "@/lib/auth/fleet-access"
import { ensureRbacCatalog } from "@/lib/repositories/roles"
import { seedLeadRecipientsIfEmpty } from "@/lib/repositories/lead-recipients"
import { upsertOrganization } from "@/lib/repositories/organizations"
import { BEAR_AND_BERRY_SLUG, VENDFORGE_LABS_SLUG } from "@/lib/auth/scope"

let readyPromise: Promise<void> | null = null

/** Deploy / local seed only — not called from request handlers. */
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

async function backfillFleetDenorm(): Promise<void> {
	const [machines, locations, inventory] = await Promise.all([
		machinesCollection(),
		locationsCollection(),
		inventoryCollection(),
	])

	const machineDocs = await machines.find({ $or: [{ orgSlug: { $exists: false } }, { orgSlug: "" }] }).toArray()
	for (const doc of machineDocs) {
		const orgSlug = orgSlugFromPath(doc.path)
		if (orgSlug) {
			await machines.updateOne({ _id: doc._id }, { $set: { orgSlug } })
		}
	}

	const locationDocs = await locations.find({ $or: [{ orgSlug: { $exists: false } }, { orgSlug: "" }] }).toArray()
	for (const doc of locationDocs) {
		const orgSlug = orgSlugFromPath(doc.path)
		if (orgSlug) {
			await locations.updateOne({ _id: doc._id }, { $set: { orgSlug } })
		}
	}

	const allMachines = await machines.find({}, { projection: { name: 1 } }).toArray()
	const nameById = new Map(allMachines.map((doc) => [doc._id.toHexString(), doc.name]))
	const slotDocs = await inventory.find({ $or: [{ machineName: { $exists: false } }, { machineName: "" }] }).toArray()
	for (const doc of slotDocs) {
		const machineName = nameById.get(doc.machineId.toHexString()) || "Unknown machine"
		await inventory.updateOne({ _id: doc._id }, { $set: { machineName } })
	}
}

async function bootstrap(): Promise<void> {
	await ensureIndexes()
	await backfillFleetDenorm()
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
