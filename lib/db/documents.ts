import type { ObjectId } from "mongodb"
import type {
	LeadIntent,
	LeadSource,
	LeadStatus,
	MachineModel,
	MachineStatus,
	Role,
	SiteType,
} from "@/types/domain"

export type UserDocument = {
	_id: ObjectId
	name: string
	email: string
	passwordHash: string
	role: Role
	organization: string | null
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
	address: string | null
	siteType: SiteType
	footfallDaily: number | null
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
