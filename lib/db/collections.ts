import type { Collection } from "mongodb"
import { getDb } from "@/lib/mongodb"
import type {
	BlogPostDocument,
	InventorySlotDocument,
	LeadDocument,
	LocationDocument,
	MachineDocument,
	OrganizationDocument,
	LeadRecipientDocument,
	PermissionDocument,
	RoleDocument,
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

export async function leadRecipientsCollection(): Promise<Collection<LeadRecipientDocument>> {
	const db = await getDb()
	return db.collection<LeadRecipientDocument>("lead_recipients")
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

export async function rolesCollection(): Promise<Collection<RoleDocument>> {
	const db = await getDb()
	return db.collection<RoleDocument>("roles")
}

export async function permissionsCollection(): Promise<Collection<PermissionDocument>> {
	const db = await getDb()
	return db.collection<PermissionDocument>("permissions")
}

export async function ensureIndexes(): Promise<void> {
	const [users, leads, recipients, machines, locations, inventory, orgs, blogs, roles, permissions] = await Promise.all([
		usersCollection(),
		leadsCollection(),
		leadRecipientsCollection(),
		machinesCollection(),
		locationsCollection(),
		inventoryCollection(),
		organizationsCollection(),
		blogPostsCollection(),
		rolesCollection(),
		permissionsCollection(),
	])

	await ensureInviteTokenHashIndex(users)

	await Promise.all([
		users.createIndex({ email: 1 }, { unique: true }),
		roles.createIndex({ slug: 1 }, { unique: true }),
		permissions.createIndex({ key: 1 }, { unique: true }),
		leads.createIndex({ createdAt: -1 }),
		leads.createIndex({ email: 1, createdAt: -1 }),
		recipients.createIndex({ email: 1 }, { unique: true }),
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

async function ensureInviteTokenHashIndex(users: Collection<UserDocument>): Promise<void> {
	await users.updateMany(
		{ $or: [{ inviteTokenHash: null }, { inviteTokenHash: "" }] },
		{ $unset: { inviteTokenHash: "" } },
	)

	const indexes = await users.indexes()
	const current = indexes.find((index) => index.name === "inviteTokenHash_1")
	const partialType = (current?.partialFilterExpression as { inviteTokenHash?: { $type?: string } } | undefined)
		?.inviteTokenHash?.$type
	if (current && partialType !== "string") {
		await users.dropIndex("inviteTokenHash_1")
	}

	await users.createIndex(
		{ inviteTokenHash: 1 },
		{
			unique: true,
			name: "inviteTokenHash_1",
			partialFilterExpression: { inviteTokenHash: { $type: "string" } },
		},
	)
}