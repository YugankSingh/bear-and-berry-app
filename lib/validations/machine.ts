import { z } from "zod"
import { MACHINE_MODELS, MACHINE_STATUSES } from "@/types/domain"

export const machineCreateSchema = z.object({
	name: z.string().trim().min(2).max(80),
	serialNumber: z.string().trim().min(3).max(80),
	model: z.enum(MACHINE_MODELS).default("BB-01"),
	status: z.enum(MACHINE_STATUSES).default("offline"),
	locationId: z.string().min(1).nullable().optional(),
	uptimePercent: z.number().min(0).max(100).default(0),
	cupsToday: z.number().int().min(0).default(0),
})

export const machinePatchSchema = machineCreateSchema.partial()

export type MachineCreateInput = z.infer<typeof machineCreateSchema>
export type MachinePatchInput = z.infer<typeof machinePatchSchema>
