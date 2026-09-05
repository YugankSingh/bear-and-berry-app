import { getEnv } from "@/lib/env"
import { ensureIndexes, locationsCollection, machinesCollection } from "@/lib/db/collections"
import { createUser, countUsers } from "@/lib/repositories/users"
import { createLead } from "@/lib/repositories/leads"
import { insertInventorySlots } from "@/lib/repositories/inventory"
import type { LocationDocument, MachineDocument } from "@/lib/db/documents"

let seedPromise: Promise<void> | null = null

export async function ensureBootstrap(): Promise<void> {
	if (process.env.NEXT_PHASE === "phase-production-build") {
		return
	}

	if (!seedPromise) {
		seedPromise = runBootstrap().catch((error: unknown) => {
			seedPromise = null
			throw error
		})
	}
	return seedPromise
}

async function runBootstrap(): Promise<void> {
	await ensureIndexes()

	const env = getEnv()
	const existingUsers = await countUsers()
	if (existingUsers > 0) {
		return
	}

	if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
		return
	}

	await createUser({
		name: env.SEED_ADMIN_NAME,
		email: env.SEED_ADMIN_EMAIL,
		password: env.SEED_ADMIN_PASSWORD,
		role: "super_admin",
		organization: "Bear & Berry",
	})

	if (!env.SEED_DEMO_DATA) {
		return
	}

	await seedDemoFleet()
}

async function seedDemoFleet(): Promise<void> {
	const now = new Date()
	const locations = await locationsCollection()
	const locationDocs: Omit<LocationDocument, "_id">[] = [
		{
			name: "Indiranagar Office Park",
			city: "Bengaluru",
			address: "12th Main, Indiranagar",
			siteType: "office",
			footfallDaily: 1400,
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Powai Fitness Club",
			city: "Mumbai",
			address: "Hiranandani, Powai",
			siteType: "gym",
			footfallDaily: 900,
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Cyber Hub Retail",
			city: "Gurugram",
			address: "DLF Cyber Hub",
			siteType: "mall",
			footfallDaily: 3200,
			createdAt: now,
			updatedAt: now,
		},
	]

	const locationResult = await locations.insertMany(locationDocs as LocationDocument[])
	const locationIds = Object.values(locationResult.insertedIds)

	const firstLocation = locationIds[0]
	const secondLocation = locationIds[1]
	const thirdLocation = locationIds[2]
	if (!firstLocation || !secondLocation || !thirdLocation) {
		return
	}

	const machines = await machinesCollection()
	const machineDocs: Omit<MachineDocument, "_id">[] = [
		{
			name: "BB-01 Indiranagar",
			serialNumber: "BB01-BLR-001",
			model: "BB-01",
			status: "online",
			locationId: firstLocation,
			uptimePercent: 99.2,
			cupsToday: 86,
			lastHeartbeatAt: now,
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "BB-01 Powai",
			serialNumber: "BB01-BOM-014",
			model: "BB-01",
			status: "maintenance",
			locationId: secondLocation,
			uptimePercent: 94.1,
			cupsToday: 21,
			lastHeartbeatAt: new Date(now.getTime() - 1000 * 60 * 42),
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "BB-01 Cyber Hub",
			serialNumber: "BB01-GGN-007",
			model: "BB-01",
			status: "online",
			locationId: thirdLocation,
			uptimePercent: 98.6,
			cupsToday: 124,
			lastHeartbeatAt: now,
			createdAt: now,
			updatedAt: now,
		},
	]

	const machineResult = await machines.insertMany(machineDocs as MachineDocument[])
	const machineIds = Object.values(machineResult.insertedIds)

	const slots = [
		{ sku: "mango", label: "Alphonso mango", quantity: 42, capacity: 60 },
		{ sku: "strawberry", label: "Strawberry", quantity: 11, capacity: 48 },
		{ sku: "banana", label: "Banana", quantity: 36, capacity: 50 },
		{ sku: "yogurt", label: "Yogurt base", quantity: 8, capacity: 40 },
	]

	const inventoryDocs = machineIds.flatMap((machineId, machineIndex) =>
		slots.map((slot, slotIndex) => ({
			machineId,
			slotIndex: slotIndex + 1,
			sku: slot.sku,
			label: slot.label,
			quantity: machineIndex === 1 && slot.sku === "yogurt" ? 3 : slot.quantity,
			capacity: slot.capacity,
			updatedAt: now,
		})),
	)

	await insertInventorySlots(inventoryDocs)

	await createLead({
		name: "Aditi Rao",
		email: "aditi@northstar.gym",
		organization: "Northstar Gyms",
		location: "Pune",
		footfall: "1,200 / day",
		intent: "unit",
		source: "contact",
		message: "Looking at two machines for our Koregaon Park and Baner clubs.",
	})

	await createLead({
		name: "Rohit Menon",
		email: "rohit@orbitoffices.in",
		business: "Orbit Offices",
		location: "Hyderabad",
		timeline: "Q4 this year",
		intent: "proposal",
		source: "homepage",
		message: "Need a commercial proposal for a 6-machine campus rollout.",
	})
}
