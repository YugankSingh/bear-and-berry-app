import { ObjectId } from "mongodb"
import { machinesCollection } from "@/lib/db/collections"
import type { MachineDocument } from "@/lib/db/documents"
import { createDeviceApiKey, createOpsCredentials, hashSecret } from "@/lib/auth/tokens"
import { encryptDeviceSecret, decryptDeviceSecret } from "@/lib/devices/secrets"
import { getDeviceKeyRotationGraceMs } from "@/lib/env"
import { findMachineById } from "@/lib/repositories/machines"
import { mapMachine } from "@/lib/db/mappers"
import type { MachineInstallState, MachineRecord } from "@/types/domain"

export async function setMachineInstallState(
	machineId: string,
	installState: MachineInstallState,
	message: string | null = null,
): Promise<MachineRecord | null> {
	if (!ObjectId.isValid(machineId)) {
		return null
	}
	const machines = await machinesCollection()
	const result = await machines.findOneAndUpdate(
		{ _id: new ObjectId(machineId) },
		{
			$set: {
				installState,
				deviceStatusMessage: message,
				updatedAt: new Date(),
			},
		},
		{ returnDocument: "after" },
	)
	return result ? mapMachine(result) : null
}

export async function provisionMachineOnPair(machineId: string): Promise<{
	machine: MachineRecord
	opsUsername: string
	opsPassword: string
	deviceKey: string
} | null> {
	if (!ObjectId.isValid(machineId)) {
		return null
	}

	const ops = createOpsCredentials()
	const device = createDeviceApiKey()
	const now = new Date()
	const machines = await machinesCollection()
	const result = await machines.findOneAndUpdate(
		{ _id: new ObjectId(machineId) },
		{
			$set: {
				opsUsername: ops.username,
				opsPasswordEnc: encryptDeviceSecret(ops.password),
				opsPasswordSetAt: now,
				deviceKeyHash: device.keyHash,
				deviceKeyPreviousHash: null,
				deviceKeyPreviousExpiresAt: null,
				deviceKeySetAt: now,
				installState: "key_ready",
				deviceStatusMessage: null,
				pairedAt: now,
				updatedAt: now,
			},
		},
		{ returnDocument: "after" },
	)
	if (!result) {
		return null
	}

	return {
		machine: mapMachine(result),
		opsUsername: ops.username,
		opsPassword: ops.password,
		deviceKey: device.key,
	}
}

export async function revealOpsPassword(machineId: string): Promise<string | null> {
	if (!ObjectId.isValid(machineId)) {
		return null
	}
	const machines = await machinesCollection()
	const doc = await machines.findOne({ _id: new ObjectId(machineId) })
	if (!doc?.opsPasswordEnc) {
		return null
	}
	return decryptDeviceSecret(doc.opsPasswordEnc)
}

export async function findMachineByDeviceKey(key: string): Promise<MachineDocument | null> {
	const trimmed = key.trim()
	if (!trimmed) {
		return null
	}
	const keyHash = hashSecret(trimmed)
	const machines = await machinesCollection()
	const now = new Date()
	const current = await machines.findOne({ deviceKeyHash: keyHash })
	if (current) {
		return current
	}
	return machines.findOne({
		deviceKeyPreviousHash: keyHash,
		deviceKeyPreviousExpiresAt: { $gt: now },
	})
}

export async function rotateDeviceApiKey(machineId: string): Promise<{
	machine: MachineRecord
	deviceKey: string
	previousExpiresAt: Date
} | null> {
	if (!ObjectId.isValid(machineId)) {
		return null
	}
	const machines = await machinesCollection()
	const existing = await machines.findOne({ _id: new ObjectId(machineId) })
	if (!existing?.deviceKeyHash) {
		return null
	}

	const next = createDeviceApiKey()
	const now = new Date()
	const previousExpiresAt = new Date(now.getTime() + getDeviceKeyRotationGraceMs())
	const result = await machines.findOneAndUpdate(
		{ _id: existing._id },
		{
			$set: {
				deviceKeyHash: next.keyHash,
				deviceKeyPreviousHash: existing.deviceKeyHash,
				deviceKeyPreviousExpiresAt: previousExpiresAt,
				deviceKeySetAt: now,
				updatedAt: now,
			},
		},
		{ returnDocument: "after" },
	)
	if (!result) {
		return null
	}
	return {
		machine: mapMachine(result),
		deviceKey: next.key,
		previousExpiresAt,
	}
}

export async function reportMachineInstallState(
	machineId: string,
	installState: MachineInstallState,
	message?: string | null,
): Promise<MachineRecord | null> {
	return setMachineInstallState(machineId, installState, message ?? null)
}

export async function touchMachineHeartbeat(machineId: string): Promise<void> {
	if (!ObjectId.isValid(machineId)) {
		return
	}
	const machines = await machinesCollection()
	await machines.updateOne(
		{ _id: new ObjectId(machineId) },
		{ $set: { lastHeartbeatAt: new Date(), updatedAt: new Date() } },
	)
}

/** Re-export for callers that already have a mapped machine. */
export { findMachineById }
