import { findMachineByDeviceKey } from "@/lib/repositories/device-provisioning"
import { mapMachine } from "@/lib/db/mappers"
import type { MachineRecord } from "@/types/domain"
import { AuthError } from "@/lib/auth/require-auth"

export function readBearerToken(request: Request): string | null {
	const header = request.headers.get("authorization")
	if (!header) {
		return null
	}
	const match = /^Bearer\s+(.+)$/i.exec(header.trim())
	return match?.[1]?.trim() || null
}

export async function requireDeviceAuth(request: Request): Promise<MachineRecord> {
	const token = readBearerToken(request)
	if (!token) {
		throw new AuthError("Device API key required.", 401)
	}
	const doc = await findMachineByDeviceKey(token)
	if (!doc) {
		throw new AuthError("Device API key is invalid or expired.", 401)
	}
	return mapMachine(doc)
}
