import { requireDeviceAuth } from "@/lib/devices/auth"
import { rotateDeviceApiKey } from "@/lib/repositories/device-provisioning"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

/** Device presents current (or previous-in-grace) key; receives a new key once. */
export async function POST(request: Request) {
	try {
		const machine = await requireDeviceAuth(request)
		const rotated = await rotateDeviceApiKey(machine.id)
		if (!rotated) {
			return fail("NOT_FOUND", "Device key is not provisioned.", 404)
		}
		return ok({
			deviceKey: rotated.deviceKey,
			previousExpiresAt: rotated.previousExpiresAt.toISOString(),
			machine: {
				id: rotated.machine.id,
				installState: rotated.machine.installState,
			},
		})
	} catch (error) {
		return handleApiError(error)
	}
}
