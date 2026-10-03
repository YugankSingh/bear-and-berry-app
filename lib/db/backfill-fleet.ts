import {
	inventoryCollection,
	locationsCollection,
	machinesCollection,
	usersCollection,
} from "@/lib/db/collections"
import { orgSlugFromPath } from "@/lib/auth/fleet-access"

export type FleetBackfillStats = {
	machineUpdates: number
	locationUpdates: number
	slotUpdates: number
	inviteTokenCleanup: number
}

/** Idempotent backfill for orgSlug / machineName (+ invite token cleanup). */
export async function backfillFleetDenorm(): Promise<FleetBackfillStats> {
	const [machines, locations, inventory, users] = await Promise.all([
		machinesCollection(),
		locationsCollection(),
		inventoryCollection(),
		usersCollection(),
	])

	const machineDocs = await machines.find({}).project({ path: 1, orgSlug: 1, name: 1 }).toArray()
	let machineUpdates = 0
	for (const doc of machineDocs) {
		const orgSlug = doc.orgSlug || orgSlugFromPath(doc.path)
		if (!orgSlug || doc.orgSlug === orgSlug) {
			continue
		}
		await machines.updateOne({ _id: doc._id }, { $set: { orgSlug } })
		machineUpdates += 1
	}

	const locationDocs = await locations.find({}).project({ path: 1, orgSlug: 1 }).toArray()
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
	const slotDocs = await inventory.find({}).project({ machineId: 1, machineName: 1 }).toArray()
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

	return {
		machineUpdates,
		locationUpdates,
		slotUpdates,
		inviteTokenCleanup: inviteCleanup.modifiedCount,
	}
}
