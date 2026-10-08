import { ObjectId } from "mongodb"
import { devicePairingCodesCollection } from "@/lib/db/collections"
import type { DevicePairingCodeDocument } from "@/lib/db/documents"
import { createDevicePairingCode, hashSecret } from "@/lib/auth/tokens"
import { findMachineById } from "@/lib/repositories/machines"
import { setMachineInstallState } from "@/lib/repositories/device-provisioning"
import type { MachineRecord } from "@/types/domain"

const MAX_MINT_ATTEMPTS = 8

function normalizePairingCode(code: string): string {
	return code.replace(/\D/g, "")
}

export async function mintMachinePairingCode(input: {
	machineId: string
	createdByUserId: string
}): Promise<{ code: string; expiresAt: Date; machine: MachineRecord }> {
	const machine = await findMachineById(input.machineId)
	if (!machine) {
		throw new Error("MACHINE_NOT_FOUND")
	}

	const col = await devicePairingCodesCollection()
	const now = new Date()

	// One active code per machine: revoke anything still live.
	await col.updateMany(
		{
			machineId: new ObjectId(input.machineId),
			revokedAt: null,
			expiresAt: { $gt: now },
		},
		{
			$set: {
				revokedAt: now,
				retainUntil: now,
				updatedAt: now,
			},
		},
	)

	for (let attempt = 0; attempt < MAX_MINT_ATTEMPTS; attempt += 1) {
		const minted = createDevicePairingCode()
		const doc: DevicePairingCodeDocument = {
			_id: new ObjectId(),
			machineId: new ObjectId(input.machineId),
			codeHash: minted.codeHash,
			expiresAt: minted.expiresAt,
			createdByUserId: new ObjectId(input.createdByUserId),
			revokedAt: null,
			retainUntil: minted.expiresAt,
			createdAt: now,
			updatedAt: now,
		}
		try {
			await col.insertOne(doc)
			await setMachineInstallState(input.machineId, "pairing", null)
			const refreshed = (await findMachineById(input.machineId)) ?? machine
			return { code: minted.code, expiresAt: minted.expiresAt, machine: refreshed }
		} catch (error) {
			const duplicate =
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				(error as { code?: number }).code === 11000
			if (!duplicate) {
				throw error
			}
		}
	}

	throw new Error("PAIRING_CODE_COLLISION")
}

export type ResolvedPairing = {
	code: string
	expiresAt: Date
	machine: MachineRecord
	pairing: DevicePairingCodeDocument
}

export async function resolveActivePairingCode(code: string): Promise<ResolvedPairing | null> {
	const normalized = normalizePairingCode(code)
	if (normalized.length !== 8) {
		return null
	}

	const col = await devicePairingCodesCollection()
	const pairing = await col.findOne({
		codeHash: hashSecret(normalized),
		revokedAt: null,
		expiresAt: { $gt: new Date() },
	})
	if (!pairing) {
		return null
	}

	const machine = await findMachineById(pairing.machineId.toHexString())
	if (!machine) {
		return null
	}

	return {
		code: normalized,
		expiresAt: pairing.expiresAt,
		machine,
		pairing,
	}
}

/** Atomically revoke an active code. Returns false if already used/expired. */
export async function consumePairingCode(pairingId: ObjectId): Promise<boolean> {
	const col = await devicePairingCodesCollection()
	const now = new Date()
	const result = await col.findOneAndUpdate(
		{
			_id: pairingId,
			revokedAt: null,
			expiresAt: { $gt: now },
		},
		{
			$set: {
				revokedAt: now,
				retainUntil: now,
				updatedAt: now,
			},
		},
		{ returnDocument: "after" },
	)
	return Boolean(result)
}
