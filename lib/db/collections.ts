import type { Collection } from "mongodb"
import { getDb } from "@/lib/mongodb"
import type {
	InventorySlotDocument,
	LeadDocument,
	LocationDocument,
	MachineDocument,
	UserDocument,
} from "@/lib/db/documents"

export async function usersCollection(): Promise<Collection<UserDocument>> {
	const db = await getDb()
	return db.collection<UserDocument>("users")
}

export async function leadsCollection(): Promise<Collection<LeadDocument>> {
	const db = await getDb()
	return db.collection<LeadDocument>("leads")
}

export async function locationsCollection(): Promise<Collection<LocationDocument>> {
	const db = await getDb()
	return db.collection<LocationDocument>("locations")
}

export async function machinesCollection(): Promise<Collection<MachineDocument>> {
	const db = await getDb()
	return db.collection<MachineDocument>("machines")
}

export async function inventoryCollection(): Promise<Collection<InventorySlotDocument>> {
	const db = await getDb()
	return db.collection<InventorySlotDocument>("inventory_slots")
}

export async function ensureIndexes(): Promise<void> {
	const [users, leads, machines, locations, inventory] = await Promise.all([
		usersCollection(),
		leadsCollection(),
		machinesCollection(),
		locationsCollection(),
		inventoryCollection(),
	])

	await Promise.all([
		users.createIndex({ email: 1 }, { unique: true }),
		leads.createIndex({ createdAt: -1 }),
		leads.createIndex({ email: 1, createdAt: -1 }),
		machines.createIndex({ serialNumber: 1 }, { unique: true }),
		locations.createIndex({ name: 1, city: 1 }),
		inventory.createIndex({ machineId: 1, slotIndex: 1 }, { unique: true }),
	])
}
