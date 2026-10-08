import { z } from "zod"
import {
	consumePairingCode,
	resolveActivePairingCode,
} from "@/lib/repositories/device-pairing"
import { provisionMachineOnPair } from "@/lib/repositories/device-provisioning"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"
import { getDeviceSshAuthorizedKeys, getSelfUrl } from "@/lib/env"

const pairSchema = z.object({
	code: z.string().trim().min(8).max(32),
})

export async function POST(request: Request) {
	try {
		const body = pairSchema.parse(await readJson(request))
		const resolved = await resolveActivePairingCode(body.code)
		if (!resolved) {
			return fail("FORBIDDEN", "Pairing code is invalid, expired, or revoked.", 403)
		}

		// Consume first so concurrent redeems cannot double-provision.
		const consumed = await consumePairingCode(resolved.pairing._id)
		if (!consumed) {
			return fail("FORBIDDEN", "Pairing code is invalid, expired, or revoked.", 403)
		}

		const provisioned = await provisionMachineOnPair(resolved.machine.id)
		if (!provisioned) {
			return fail("NOT_FOUND", "Machine not found.", 404)
		}

		const base = getSelfUrl().replace(/\/$/, "")
		return ok({
			scriptsBaseUrl: `${base}/apis/devices/scripts`,
			sshAuthorizedKeys: getDeviceSshAuthorizedKeys(),
			opsUsername: provisioned.opsUsername,
			opsPassword: provisioned.opsPassword,
			deviceKey: provisioned.deviceKey,
			installState: provisioned.machine.installState,
			machine: {
				id: provisioned.machine.id,
				name: provisioned.machine.name,
				serialNumber: provisioned.machine.serialNumber,
				model: provisioned.machine.model,
				locationName: provisioned.machine.locationName,
				orgSlug: provisioned.machine.orgSlug,
				installState: provisioned.machine.installState,
			},
		})
	} catch (error) {
		return handleApiError(error)
	}
}
