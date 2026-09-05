import type {
	BlogPostDocument,
	InventorySlotDocument,
	LeadDocument,
	LocationDocument,
	MachineDocument,
	OrganizationDocument,
	UserDocument,
} from "@/lib/db/documents"
import type { BlogPostRecord } from "@/types/cms"
import type {
	InventorySlotRecord,
	LeadRecord,
	LocationRecord,
	MachineRecord,
	OrganizationRecord,
	UserRecord,
} from "@/types/domain"

export function toIso(date: Date): string {
	return date.toISOString()
}

export function mapOrganization(doc: OrganizationDocument): OrganizationRecord {
	return {
		id: doc._id.toHexString(),
		slug: doc.slug,
		name: doc.name,
		kind: doc.kind,
		tags: doc.tags,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapUser(doc: UserDocument): UserRecord {
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		email: doc.email,
		role: doc.role,
		orgId: doc.orgId.toHexString(),
		orgSlug: doc.orgSlug,
		organization: doc.organization,
		scopePath: doc.scopePath,
		tags: doc.tags,
		isActive: doc.isActive,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapLead(doc: LeadDocument): LeadRecord {
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		email: doc.email,
		phone: doc.phone,
		organization: doc.organization,
		location: doc.location,
		footfall: doc.footfall,
		timeline: doc.timeline,
		operatorContext: doc.operatorContext,
		message: doc.message,
		intent: doc.intent,
		source: doc.source,
		status: doc.status,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapLocation(doc: LocationDocument): LocationRecord {
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		city: doc.city,
		region: doc.region,
		address: doc.address,
		siteType: doc.siteType,
		footfallDaily: doc.footfallDaily,
		orgId: doc.orgId.toHexString(),
		path: doc.path,
		tags: doc.tags,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapMachine(
	doc: MachineDocument,
	locationName: string | null = null,
): MachineRecord {
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		serialNumber: doc.serialNumber,
		model: doc.model,
		status: doc.status,
		locationId: doc.locationId ? doc.locationId.toHexString() : null,
		locationName,
		orgId: doc.orgId.toHexString(),
		path: doc.path,
		tags: doc.tags,
		uptimePercent: doc.uptimePercent,
		cupsToday: doc.cupsToday,
		lastHeartbeatAt: doc.lastHeartbeatAt ? toIso(doc.lastHeartbeatAt) : null,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapInventorySlot(
	doc: InventorySlotDocument,
	machineName: string,
): InventorySlotRecord {
	return {
		id: doc._id.toHexString(),
		machineId: doc.machineId.toHexString(),
		machineName,
		slotIndex: doc.slotIndex,
		sku: doc.sku,
		label: doc.label,
		quantity: doc.quantity,
		capacity: doc.capacity,
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapBlogPost(doc: BlogPostDocument): BlogPostRecord {
	return {
		id: doc._id.toHexString(),
		slug: doc.slug,
		title: doc.title,
		description: doc.description,
		category: doc.category,
		readTime: doc.readTime,
		status: doc.status,
		publishedAt: doc.publishedAt ? toIso(doc.publishedAt) : null,
		content: doc.content,
		authorName: doc.authorName,
		tags: doc.tags,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}