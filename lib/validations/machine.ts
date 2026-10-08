import { z } from "zod"
import { MACHINE_MODELS, MACHINE_STATUSES, type MachineInstallState } from "@/types/domain"
import { SSH_HOST_PATTERN } from "@/lib/devices/ssh-host"

export const sshHostSchema = z
	.string()
	.trim()
	.min(1)
	.max(253)
	.regex(SSH_HOST_PATTERN, "SSH host must be a hostname or IP address.")

export const machineCreateSchema = z.object({
	name: z.string().trim().min(2).max(80),
	serialNumber: z.string().trim().min(3).max(80),
	model: z.enum(MACHINE_MODELS).default("BB-01"),
	status: z.enum(MACHINE_STATUSES).default("offline"),
	locationId: z.string().min(1).nullable().optional(),
	orgSlug: z.string().trim().min(2).max(80).optional(),
	uptimePercent: z.number().min(0).max(100).default(0),
	cupsToday: z.number().int().min(0).default(0),
	tags: z.array(z.string().trim().min(1).max(40)).optional(),
})

/** User-editable fields only. Device fields go through `devices:pair` routes or device auth. */
export const machinePatchSchema = machineCreateSchema.omit({ orgSlug: true }).partial()

export type MachineCreateInput = z.infer<typeof machineCreateSchema>
export type MachinePatchInput = z.infer<typeof machinePatchSchema>

export type MachineUpdateInput = MachinePatchInput & {
	sshHost?: string | null
	installState?: MachineInstallState
	deviceStatusMessage?: string | null
}
