import { ObjectId } from "mongodb"
import { machinesCollection } from "@/lib/db/collections"
import { mapMachine } from "@/lib/db/mappers"
import type { MachineDocument } from "@/lib/db/documents"
import { findLocationsByIds } from "@/lib/repositories/locations"
import type { MachineCreateInput, MachinePatchInput } from "@/lib/validations/machine"
import type { MachineRecord, MachineStatus } from "@/types/domain"

function toObjectId(id: string | null | undefined): ObjectId | null {
	if (!id || !ObjectId.isValid(id)) {
		return null
	}
	return new ObjectId(id)
}

async function withLocations(docs: MachineDocument[]): Promise<MachineRecord[]> {
	const locationIds = docs
		.map((doc) => doc.locationId)
		.filter((id): id is ObjectId => id !== null)
	const locations = await findLocationsByIds(locationIds)
	return docs.map((doc) =>
		mapMachine(
			doc,
			doc.locationId ? (locations.get(doc.locationId.toHexString())?.name ?? null) : null,
		),
	)
}

export async function listMachines(): Promise<MachineRecord[]> {
	const machines = await machinesCollection()
	const docs = await machines.find({}).sort({ name: 1 }).toArray()
	return withLocations(docs)
}

export async function createMachine(input: MachineCreateInput): Promise<MachineRecord> {
	const machines = await machinesCollection()
	const now = new Date()
	const doc: Omit<MachineDocument, "_id"> = {
		name: input.name,
		serialNumber: input.serialNumber,
		model: input.model,
		status: input.status,
		locationId: toObjectId(input.locationId),
		uptimePercent: input.uptimePercent,
		cupsToday: input.cupsToday,
		lastHeartbeatAt: input.status === "online" ? now : null,
		createdAt: now,
		updatedAt: now,
	}
	const result = await machines.insertOne(doc as MachineDocument)
	const [mapped] = await withLocations([{ ...doc, _id: result.insertedId }])
	if (!mapped) {
		throw new Error("Failed to map created machine")
	}
	return mapped
}

export async function updateMachine(
	id: string,
	input: MachinePatchInput,
): Promise<MachineRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}

	const machines = await machinesCollection()
	const $set: Partial<MachineDocument> = { updatedAt: new Date() }

	if (input.name !== undefined) $set.name = input.name
	if (input.serialNumber !== undefined) $set.serialNumber = input.serialNumber
	if (input.model !== undefined) $set.model = input.model
	if (input.status !== undefined) $set.status = input.status
	if (input.locationId !== undefined) $set.locationId = toObjectId(input.locationId)
	if (input.uptimePercent !== undefined) $set.uptimePercent = input.uptimePercent
	if (input.cupsToday !== undefined) $set.cupsToday = input.cupsToday

	const result = await machines.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set },
		{ returnDocument: "after" },
	)
	if (!result) {
		return null
	}
	const [mapped] = await withLocations([result])
	return mapped ?? null
}

export async function countMachinesByStatus(): Promise<Record<MachineStatus, number>> {
	const machines = await machinesCollection()
	const groups = await machines
		.aggregate<{ _id: MachineStatus; count: number }>([
			{ $group: { _id: "$status", count: { $sum: 1 } } },
		])
		.toArray()

	const counts: Record<MachineStatus, number> = {
		online: 0,
		offline: 0,
		maintenance: 0,
		error: 0,
	}

	for (const group of groups) {
		counts[group._id] = group.count
	}

	return counts
}

export async function sumCupsToday(): Promise<number> {
	const machines = await machinesCollection()
	const [result] = await machines
		.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: "$cupsToday" } } }])
		.toArray()
	return result?.total ?? 0
}
