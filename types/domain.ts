import type { AccessGrant, AccessibleOrg, OrgMembership } from "@/lib/auth/grants"

export type { AccessGrant, AccessibleOrg, OrgMembership }

export const APP_ENVIRONMENTS = ["development", "staging", "production"] as const
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number]

export type Role = string

export const ACCESS_STATUSES = ["waitlisted", "pending_invite", "invited"] as const
export type AccessStatus = (typeof ACCESS_STATUSES)[number]

export const INVITE_STATES = ["none", "pending", "expired", "accepted"] as const
export type InviteState = (typeof INVITE_STATES)[number]

export const PERMISSIONS = [
	"dashboard:read",
	"leads:read",
	"leads:write",
	"leads:delete",
	"leads:notify",
	"machines:read",
	"machines:write",
	"devices:pair",
	"locations:read",
	"locations:write",
	"inventory:read",
	"inventory:write",
	"revenue:read",
	"users:read",
	"users:write",
	"users:delete",
	"users:grant",
	"signups:read",
	"signups:approve",
	"signups:reject",
	"roles:read",
	"roles:write",
	"settings:read",
	"settings:write",
	"cms:read",
	"cms:write",
	"orgs:all",
	"orgs:tag",
	"system:admin",
	"developer:read",
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const ORGS_ALL_PERMISSION = "orgs:all" satisfies Permission
export const SYSTEM_ADMIN_PERMISSION = "system:admin" satisfies Permission

export type RoleRecord = {
	id: string
	slug: string
	name: string
	description: string
	rank: number
	permissions: Permission[]
	isSystem: boolean
	createdAt: string
	updatedAt: string
}

export type PermissionRecord = {
	key: Permission
	name: string
	group: string
}

export const ORG_KINDS = ["internal", "partner"] as const
export type OrgKind = (typeof ORG_KINDS)[number]

export const LEAD_INTENTS = ["unit", "proposal", "admin"] as const
export type LeadIntent = (typeof LEAD_INTENTS)[number]

export const LEAD_STATUSES = ["new", "contacted", "qualified", "closed"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_SOURCES = ["homepage", "contact", "api"] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const MACHINE_STATUSES = ["online", "offline", "maintenance", "error"] as const
export type MachineStatus = (typeof MACHINE_STATUSES)[number]

export const MACHINE_MODELS = ["BB-01"] as const
export type MachineModel = (typeof MACHINE_MODELS)[number]

export const MACHINE_INSTALL_STATES = [
	"unpaired",
	"pairing",
	"ssh_ready",
	"key_ready",
	"hardened",
	"kiosk_ready",
	"error",
] as const
export type MachineInstallState = (typeof MACHINE_INSTALL_STATES)[number]

export const SITE_TYPES = ["office", "gym", "mall", "campus", "transit", "other"] as const
export type SiteType = (typeof SITE_TYPES)[number]

export type OrganizationRecord = {
	id: string
	slug: string
	name: string
	kind: OrgKind
	tags: string[]
	createdAt: string
	updatedAt: string
}

export type UserRecord = {
	id: string
	name: string
	email: string
	role: Role
	roleName: string
	roleRank: number
	/** Primary organization document id (home org for login defaults). */
	orgId: string
	/** Denormalized slug of the home organization. */
	orgSlug: string
	tags: string[]
	isActive: boolean
	accessStatus: AccessStatus
	/** Which orgs (or org tags) this user's role permissions attach to. */
	memberships: OrgMembership[]
	extraGrants: AccessGrant[]
	grants: AccessGrant[]
	grantKeys: string[]
	permissions: Permission[]
	emailVerified: boolean
	passwordReady: boolean
	inviteState: InviteState
	inviteExpiresAt: string | null
	deletedAt: string | null
	createdAt: string
	updatedAt: string
}

export type SessionUser = {
	id: string
	name: string
	email: string
	role: Role
	roleName: string
	roleRank: number
	orgId: string
	orgSlug: string
	tags: string[]
	accessStatus: AccessStatus
	memberships: OrgMembership[]
	extraGrants: AccessGrant[]
	grants: AccessGrant[]
	grantKeys: string[]
	permissions: Permission[]
	accessibleOrgs: AccessibleOrg[]
	activeOrgSlug: string
	canAccessAdmin: boolean
}

export type LeadRecipientRecord = {
	id: string
	email: string
	tags: string[]
	createdAt: string
	updatedAt: string
}

export type LeadComment = {
	id: string
	body: string
	authorId: string
	authorName: string
	createdAt: string
}

export type LeadRecord = {
	id: string
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
	archivedAt: string | null
	comments: LeadComment[]
	createdAt: string
	updatedAt: string
}

export type LocationRecord = {
	id: string
	name: string
	city: string
	region: string
	address: string | null
	siteType: SiteType
	footfallDaily: number | null
	orgId: string
	orgSlug: string
	path: string
	tags: string[]
	createdAt: string
	updatedAt: string
}

export type MachineRecord = {
	id: string
	name: string
	serialNumber: string
	model: MachineModel
	status: MachineStatus
	locationId: string | null
	locationName: string | null
	orgId: string
	orgSlug: string
	path: string
	tags: string[]
	uptimePercent: number
	cupsToday: number
	lastHeartbeatAt: string | null
	installState: MachineInstallState
	deviceStatusMessage: string | null
	opsUsername: string | null
	opsPasswordSetAt: string | null
	hasOpsPassword: boolean
	hasDeviceKey: boolean
	sshHost: string | null
	pairedAt: string | null
	createdAt: string
	updatedAt: string
}

export type InventorySlotRecord = {
	id: string
	machineId: string
	machineName: string
	slotIndex: number
	sku: string
	label: string
	quantity: number
	capacity: number
	updatedAt: string
}