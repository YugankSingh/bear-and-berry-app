import { requirePermission } from "@/lib/auth/require-auth"
import { canSeeMachine } from "@/lib/auth/fleet-access"
import { mintMachinePairingCode } from "@/lib/repositories/device-pairing"
import { findMachineById } from "@/lib/repositories/machines"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"
import { getDevicePairingTtlMs } from "@/lib/env"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
	try {
		const user = await requirePermission("devices:pair")
		const { id } = await context.params
		const machine = await findMachineById(id)
		if (!machine) {
			return fail("NOT_FOUND", "Machine not found.", 404)
		}
		// Platform admins see every machine; keep the scope check for future non-admin grants.
		if (!canSeeMachine(user, machine)) {
			return fail("FORBIDDEN", "You do not have access to that machine.", 403)
		}

		const minted = await mintMachinePairingCode({
			machineId: id,
			createdByUserId: user.id,
		})

		return ok({
			code: minted.code,
			expiresAt: minted.expiresAt.toISOString(),
			ttlMs: getDevicePairingTtlMs(),
			machine: {
				id: minted.machine.id,
				name: minted.machine.name,
				serialNumber: minted.machine.serialNumber,
				model: minted.machine.model,
				locationName: minted.machine.locationName,
			},
		})
	} catch (error) {
		if (error instanceof Error && error.message === "MACHINE_NOT_FOUND") {
			return fail("NOT_FOUND", "Machine not found.", 404)
		}
		if (error instanceof Error && error.message === "PAIRING_CODE_COLLISION") {
			return fail("CONFLICT", "Could not mint a unique pairing code. Try again.", 409)
		}
		return handleApiError(error)
	}
}
