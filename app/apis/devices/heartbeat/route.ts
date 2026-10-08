import { z } from "zod"
import { MACHINE_INSTALL_STATES } from "@/types/domain"
import { requireDeviceAuth } from "@/lib/devices/auth"
import {
	reportMachineInstallState,
	touchMachineHeartbeat,
} from "@/lib/repositories/device-provisioning"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

const heartbeatSchema = z.object({
	installState: z.enum(MACHINE_INSTALL_STATES).optional(),
	message: z.string().trim().max(500).nullable().optional(),
	sshHost: z.string().trim().min(1).max(255).optional(),
})

export async function POST(request: Request) {
	try {
		const machine = await requireDeviceAuth(request)
		const body = heartbeatSchema.parse(await readJson(request).catch(() => ({})))

		await touchMachineHeartbeat(machine.id)

		if (body.installState) {
			const updated = await reportMachineInstallState(
				machine.id,
				body.installState,
				body.message ?? null,
			)
			if (!updated) {
				return fail("NOT_FOUND", "Machine not found.", 404)
			}
			return ok({
				machine: {
					id: updated.id,
					installState: updated.installState,
					sshHost: updated.sshHost,
				},
			})
		}

		if (body.sshHost) {
			const { updateMachine } = await import("@/lib/repositories/machines")
			const updated = await updateMachine(machine.id, { sshHost: body.sshHost })
			return ok({
				machine: {
					id: updated?.id ?? machine.id,
					installState: updated?.installState ?? machine.installState,
					sshHost: updated?.sshHost ?? body.sshHost,
				},
			})
		}

		return ok({
			machine: {
				id: machine.id,
				installState: machine.installState,
				sshHost: machine.sshHost,
			},
		})
	} catch (error) {
		return handleApiError(error)
	}
}
