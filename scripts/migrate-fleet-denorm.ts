/**
 * Backfills orgSlug on machines/locations and machineName on inventory slots.
 * Also cleans empty inviteTokenHash values that break the partial unique index.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/migrate-fleet-denorm.ts
 */
import { inventoryCollection, locationsCollection, machinesCollection, usersCollection } from "../lib/db/collections"
import { orgSlugFromPath } from "../lib/auth/fleet-access"

async function main() {
	const [machines, locations, inventory, users] = await Promise.all([
		machinesCollection(),
		locationsCollection(),
		inventoryCollection(),
		usersCollection(),
	])

	const machineDocs = await machines.find({}).toArray()
	let machineUpdates = 0
	for (const doc of machineDocs) {
		const orgSlug = doc.orgSlug || orgSlugFromPath(doc.path)
		if (!orgSlug || doc.orgSlug === orgSlug) {
			continue
		}
		await machines.updateOne({ _id: doc._id }, { $set: { orgSlug } })
		machineUpdates += 1
	}

	const locationDocs = await locations.find({}).toArray()
	let locationUpdates = 0
	for (const doc of locationDocs) {
		const orgSlug = doc.orgSlug || orgSlugFromPath(doc.path)
		if (!orgSlug || doc.orgSlug === orgSlug) {
			continue
		}
		await locations.updateOne({ _id: doc._id }, { $set: { orgSlug } })
		locationUpdates += 1
	}

	const nameById = new Map(machineDocs.map((doc) => [doc._id.toHexString(), doc.name]))
	const slotDocs = await inventory.find({}).toArray()
	let slotUpdates = 0
	for (const doc of slotDocs) {
		const machineName = doc.machineName || nameById.get(doc.machineId.toHexString()) || "Unknown machine"
		if (doc.machineName === machineName) {
			continue
		}
		await inventory.updateOne({ _id: doc._id }, { $set: { machineName } })
		slotUpdates += 1
	}

	const inviteCleanup = await users.updateMany(
		{ $or: [{ inviteTokenHash: null }, { inviteTokenHash: "" }] },
		{ $unset: { inviteTokenHash: "" } },
	)

	console.log(
		JSON.stringify(
			{
				machineUpdates,
				locationUpdates,
				slotUpdates,
				inviteTokenCleanup: inviteCleanup.modifiedCount,
			},
			null,
			2,
		),
	)
}

main()
	.then(() => process.exit(0))
	.catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
