import { ObjectId } from "mongodb"
import { getEnv } from "@/lib/env"
import { ensureIndexes, locationsCollection, machinesCollection } from "@/lib/db/collections"
import { upsertOrganization } from "@/lib/repositories/organizations"
import { countBlogPosts, createBlogPost } from "@/lib/repositories/blogs"
import { insertInventorySlots } from "@/lib/repositories/inventory"
import { BLOG_POSTS } from "@/lib/cms/default-posts"
import { BEAR_AND_BERRY_SLUG, VENDFORGE_LABS_SLUG, joinScopePath } from "@/lib/auth/scope"
import type { LocationDocument, MachineDocument } from "@/lib/db/documents"

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

	const env = getEnv()
	if (env.SEED_DEMO_DATA) {
		const locations = await locationsCollection()
		if ((await locations.countDocuments()) === 0) {
			await seedDemoFleet()
		}
		if ((await countBlogPosts()) === 0) {
			await seedDefaultBlogs()
		}
	}
}

async function seedDefaultBlogs(): Promise<void> {
	for (const post of BLOG_POSTS) {
		await createBlogPost({
			slug: post.slug,
			title: post.title,
			description: post.description,
			category: post.category,
			readTime: post.readTime,
			status: "published",
			content: post.content,
			authorName: "Bear & Berry",
			tags: ["seed"],
		})
	}
}

async function seedDemoFleet(): Promise<void> {
	const org = await upsertOrganization({
		slug: BEAR_AND_BERRY_SLUG,
		name: "Bear & Berry",
		kind: "internal",
		tags: ["fleet"],
	})
	const orgId = new ObjectId(org.id)
	const now = new Date()
	const locations = await locationsCollection()

	const locationSeeds = [
		{
			name: "Indiranagar Office Park",
			city: "Bengaluru",
			region: "South",
			address: "12th Main, Indiranagar",
			siteType: "office" as const,
			footfallDaily: 1400,
			tags: ["office", "pilot"],
		},
		{
			name: "Powai Fitness Club",
			city: "Mumbai",
			region: "West",
			address: "Hiranandani, Powai",
			siteType: "gym" as const,
			footfallDaily: 900,
			tags: ["gym"],
		},
		{
			name: "Cyber Hub Retail",
			city: "Gurugram",
			region: "North",
			address: "DLF Cyber Hub",
			siteType: "mall" as const,
			footfallDaily: 3200,
			tags: ["mall"],
		},
	]

	const locationDocs: Omit<LocationDocument, "_id">[] = locationSeeds.map((location) => ({
		...location,
		orgId,
		path: joinScopePath([BEAR_AND_BERRY_SLUG, location.region, location.city, location.name]),
		createdAt: now,
		updatedAt: now,
	}))

	const locationResult = await locations.insertMany(locationDocs as LocationDocument[])
	const locationIds = Object.values(locationResult.insertedIds)
	const first = locationIds[0]
	const second = locationIds[1]
	const third = locationIds[2]
	if (!first || !second || !third) {
		return
	}

	const machines = await machinesCollection()
	const machineSeeds = [
		{
			name: "BB-01 Indiranagar",
			serialNumber: "BB01-BLR-001",
			status: "online" as const,
			locationId: first,
			locationPath: locationDocs[0]?.path ?? "",
			uptimePercent: 99.2,
			cupsToday: 86,
			tags: ["gen1"],
		},
		{
			name: "BB-01 Powai",
			serialNumber: "BB01-BOM-014",
			status: "maintenance" as const,
			locationId: second,
			locationPath: locationDocs[1]?.path ?? "",
			uptimePercent: 94.1,
			cupsToday: 21,
			tags: ["gen1"],
		},
		{
			name: "BB-01 Cyber Hub",
			serialNumber: "BB01-GGN-007",
			status: "online" as const,
			locationId: third,
			locationPath: locationDocs[2]?.path ?? "",
			uptimePercent: 98.6,
			cupsToday: 124,
			tags: ["gen1"],
		},
	]

	const machineDocs: Omit<MachineDocument, "_id">[] = machineSeeds.map((machine) => ({
		name: machine.name,
		serialNumber: machine.serialNumber,
		model: "BB-01",
		status: machine.status,
		locationId: machine.locationId,
		orgId,
		path: `${machine.locationPath}/${machine.serialNumber.toLowerCase()}`,
		tags: machine.tags,
		uptimePercent: machine.uptimePercent,
		cupsToday: machine.cupsToday,
		lastHeartbeatAt: machine.status === "online" ? now : new Date(now.getTime() - 1000 * 60 * 42),
		createdAt: now,
		updatedAt: now,
	}))

	const machineResult = await machines.insertMany(machineDocs as MachineDocument[])
	const slots = [
		{ sku: "mango", label: "Alphonso mango", quantity: 42, capacity: 60 },
		{ sku: "strawberry", label: "Strawberry", quantity: 11, capacity: 48 },
		{ sku: "banana", label: "Banana", quantity: 36, capacity: 50 },
		{ sku: "yogurt", label: "Yogurt base", quantity: 8, capacity: 40 },
	]

	await insertInventorySlots(
		Object.values(machineResult.insertedIds).flatMap((machineId, machineIndex) =>
			slots.map((slot, slotIndex) => ({
				machineId,
				slotIndex: slotIndex + 1,
				sku: slot.sku,
				label: slot.label,
				quantity: machineIndex === 1 && slot.sku === "yogurt" ? 3 : slot.quantity,
				capacity: slot.capacity,
				updatedAt: now,
			})),
		),
	)
}