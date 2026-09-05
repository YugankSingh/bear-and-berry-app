import type { Collection } from "mongodb"
import { getDb } from "@/lib/mongodb"
import type {
	BlogPostDocument,
	InventorySlotDocument,
	LeadDocument,
	LocationDocument,
	MachineDocument,
	OrganizationDocument,
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

export async function organizationsCollection(): Promise<Collection<OrganizationDocument>> {
	const db = await getDb()
	return db.collection<OrganizationDocument>("organizations")
}

export async function blogPostsCollection(): Promise<Collection<BlogPostDocument>> {
	const db = await getDb()
	return db.collection<BlogPostDocument>("blog_posts")
}

export async function ensureIndexes(): Promise<void> {
	const [users, leads, machines, locations, inventory, orgs, blogs] = await Promise.all([
		usersCollection(),
		leadsCollection(),
		machinesCollection(),
		locationsCollection(),
		inventoryCollection(),
		organizationsCollection(),
		blogPostsCollection(),
	])

	await Promise.all([
		users.createIndex({ email: 1 }, { unique: true }),
		leads.createIndex({ createdAt: -1 }),
		leads.createIndex({ email: 1, createdAt: -1 }),
		machines.createIndex({ serialNumber: 1 }, { unique: true }),
		machines.createIndex({ path: 1 }),
		locations.createIndex({ path: 1 }),
		locations.createIndex({ name: 1, city: 1 }),
		inventory.createIndex({ machineId: 1, slotIndex: 1 }, { unique: true }),
		orgs.createIndex({ slug: 1 }, { unique: true }),
		blogs.createIndex({ slug: 1 }, { unique: true }),
		blogs.createIndex({ status: 1, publishedAt: -1 }),
	])
}