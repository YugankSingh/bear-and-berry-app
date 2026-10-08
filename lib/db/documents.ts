import type { ObjectId } from "mongodb"
import type {
	LeadIntent,
	LeadSource,
	LeadStatus,
	MachineInstallState,
	MachineModel,
	MachineStatus,
	OrgKind,
	AccessStatus,
	Permission,
	Role,
	SiteType,
	OrgMembership,
	AccessGrant,
} from "@/types/domain"
import type { BlogStatus } from "@/types/cms"

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
	tags: string[]
	isActive: boolean
	accessStatus?: AccessStatus
	memberships?: OrgMembership[]
	extraGrants?: AccessGrant[]
	emailVerified?: boolean
	passwordReady?: boolean
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | null
	inviteAcceptedAt?: Date | null
	emailOtpHash?: string | null
	emailOtpExpiresAt?: Date | null
	deletedAt?: Date | null
	createdAt: Date
	updatedAt: Date
}

export type RoleDocument = {
	_id: ObjectId
	slug: string
	name: string
	description: string
	rank: number
	permissions: Permission[]
	isSystem: boolean
	createdAt: Date
	updatedAt: Date
}

export type PermissionDocument = {
	_id: ObjectId
	key: Permission
	name: string
	group: string
	createdAt: Date
	updatedAt: Date
}

export type LeadCommentDocument = {
	id: string
	body: string
	authorId: string
	authorName: string
	createdAt: Date
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
	archivedAt?: Date | null
	comments?: LeadCommentDocument[]
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
	orgSlug: string
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
	orgSlug: string
	path: string
	tags: string[]
	uptimePercent: number
	cupsToday: number
	lastHeartbeatAt: Date | null
	installState?: MachineInstallState
	deviceStatusMessage?: string | null
	opsUsername?: string | null
	opsPasswordEnc?: string | null
	opsPasswordSetAt?: Date | null
	deviceKeyHash?: string | null
	deviceKeyPreviousHash?: string | null
	deviceKeyPreviousExpiresAt?: Date | null
	deviceKeySetAt?: Date | null
	sshHost?: string | null
	pairedAt?: Date | null
	createdAt: Date
	updatedAt: Date
}

export type InventorySlotDocument = {
	_id: ObjectId
	machineId: ObjectId
	machineName: string
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
	metaTitle?: string
	metaDescription?: string
	category: string
	readTime: string
	status: BlogStatus
	publishedAt: Date | null
	content: string
	authorName: string
	tags: string[]
	createdAt: Date
	updatedAt: Date
}

export type LeadRecipientDocument = {
	_id: ObjectId
	email: string
	tags: string[]
	createdAt: Date
	updatedAt: Date
}

/**
 * Machine-bound pairing codes.
 * The 8-digit code itself authenticates the device until expiresAt.
 * Looking up the code resolves which machine record is being provisioned.
 */
export type DevicePairingCodeDocument = {
	_id: ObjectId
	machineId: ObjectId
	codeHash: string
	expiresAt: Date
	createdByUserId: ObjectId
	revokedAt: Date | null
	/** Mongo TTL sweeper target (same as expiresAt unless revoked early). */
	retainUntil: Date
	createdAt: Date
	updatedAt: Date
}