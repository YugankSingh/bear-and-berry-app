export const APP_ENVIRONMENTS = ["development", "staging", "production"] as const
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number]

export const ROLES = ["super_admin", "admin", "operator", "viewer"] as const
export type Role = (typeof ROLES)[number]

export const PERMISSIONS = [
	"dashboard:read",
	"leads:read",
	"leads:write",
	"leads:delete",
	"machines:read",
	"machines:write",
	"locations:read",
	"locations:write",
	"inventory:read",
	"inventory:write",
	"revenue:read",
	"users:read",
	"users:write",
	"settings:read",
	"settings:write",
] as const
export type Permission = (typeof PERMISSIONS)[number]

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

export const SITE_TYPES = ["office", "gym", "mall", "campus", "transit", "other"] as const
export type SiteType = (typeof SITE_TYPES)[number]

export type UserRecord = {
	id: string
	name: string
	email: string
	role: Role
	organization: string | null
	isActive: boolean
	createdAt: string
	updatedAt: string
}

export type SessionUser = {
	id: string
	name: string
	email: string
	role: Role
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
	createdAt: string
	updatedAt: string
}

export type LocationRecord = {
	id: string
	name: string
	city: string
	address: string | null
	siteType: SiteType
	footfallDaily: number | null
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
	uptimePercent: number
	cupsToday: number
	lastHeartbeatAt: string | null
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
