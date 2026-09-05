import type { ObjectId } from "mongodb"
import type {
	LeadIntent,
	LeadSource,
	LeadStatus,
	MachineModel,
	MachineStatus,
	OrgKind,
	Role,
	SiteType,
} from "@/types/domain"
import type { BlogContentBlock, BlogStatus } from "@/types/cms"

export type OrganizationDocument = {
	_id: ObjectId
	slug: string
	name: string
	kind: OrgKind
	tags: string[]
	createdAt: Date
	updatedAt: Date
}

export type UserDocument = {
	_id: ObjectId
	name: string
	email: string
	passwordHash: string
	role: Role
	orgId: ObjectId
	orgSlug: string
	organization: string | null
	scopePath: string
	tags: string[]
	isActive: boolean
	createdAt: Date
	updatedAt: Date
}

export type LeadDocument = {
	_id: ObjectId
	name: string | null
	email: string
	phone: string | null
	organization: string | null
	location: string | null
	footfall: string | null
	timeline: string | null
	operatorContext: string | null
	message: string | null
	intent: LeadIntent
	source: LeadSource
	status: LeadStatus
	createdAt: Date
	updatedAt: Date
}

export type LocationDocument = {
	_id: ObjectId
	name: string
	city: string
	region: string
	address: string | null
	siteType: SiteType
	footfallDaily: number | null
	orgId: ObjectId
	path: string
	tags: string[]
	createdAt: Date
	updatedAt: Date
}

export type MachineDocument = {
	_id: ObjectId
	name: string
	serialNumber: string
	model: MachineModel
	status: MachineStatus
	locationId: ObjectId | null
	orgId: ObjectId
	path: string
	tags: string[]
	uptimePercent: number
	cupsToday: number
	lastHeartbeatAt: Date | null
	createdAt: Date
	updatedAt: Date
}

export type InventorySlotDocument = {
	_id: ObjectId
	machineId: ObjectId
	slotIndex: number
	sku: string
	label: string
	quantity: number
	capacity: number
	updatedAt: Date
}

export type BlogPostDocument = {
	_id: ObjectId
	slug: string
	title: string
	description: string
	category: string
	readTime: string
	status: BlogStatus
	publishedAt: Date | null
	content: BlogContentBlock[]
	authorName: string
	tags: string[]
	createdAt: Date
	updatedAt: Date
}