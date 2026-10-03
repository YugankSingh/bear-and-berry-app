import { ObjectId } from "mongodb"
import { inventoryCollection, machinesCollection } from "@/lib/db/collections"
import { mapInventorySlot } from "@/lib/db/mappers"
import type { InventorySlotDocument } from "@/lib/db/documents"
import type { InventorySlotRecord } from "@/types/domain"

export type InventoryListOptions = {
	machineIds?: string[]
}

function toObjectIds(ids: string[]): ObjectId[] {
	return ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
}

async function resolveSlot(doc: InventorySlotDocument): Promise<InventorySlotRecord> {
	if (doc.machineName) {
		return mapInventorySlot(doc)
	}
	const machines = await machinesCollection()
	const machine = await machines.findOne({ _id: doc.machineId }, { projection: { name: 1 } })
	return mapInventorySlot(doc, machine?.name)
}

export async function listInventory(options: InventoryListOptions = {}): Promise<InventorySlotRecord[]> {
	const slots = await inventoryCollection()
	const filter =
		options.machineIds && options.machineIds.length > 0
			? { machineId: { $in: toObjectIds(options.machineIds) } }
			: {}
	const docs = await slots.find(filter).sort({ machineId: 1, slotIndex: 1 }).toArray()

	const missing = docs.filter((doc) => !doc.machineName)
	if (missing.length === 0) {
		return docs.map((doc) => mapInventorySlot(doc))
	}

	const machines = await machinesCollection()
	const machineDocs = await machines
		.find({ _id: { $in: missing.map((doc) => doc.machineId) } }, { projection: { name: 1 } })
		.toArray()
	const names = new Map(machineDocs.map((machine) => [machine._id.toHexString(), machine.name]))
	return docs.map((doc) => mapInventorySlot(doc, names.get(doc.machineId.toHexString())))
}

export async function findInventoryById(id: string): Promise<InventorySlotRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}
	const slots = await inventoryCollection()
	const doc = await slots.findOne({ _id: new ObjectId(id) })
	return doc ? resolveSlot(doc) : null
}

export async function updateInventoryQuantity(
	id: string,
	quantity: number,
): Promise<InventorySlotRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}

	const slots = await inventoryCollection()
	const result = await slots.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set: { quantity, updatedAt: new Date() } },
		{ returnDocument: "after" },
	)
	return result ? resolveSlot(result) : null
}

export async function countLowInventory(threshold = 0.25): Promise<number> {
	const slots = await inventoryCollection()
	return slots.countDocuments({
		$expr: { $lte: ["$quantity", { $multiply: ["$capacity", threshold] }] },
	})
}

export async function insertInventorySlots(
	docs: Omit<InventorySlotDocument, "_id">[],
): Promise<void> {
	if (docs.length === 0) {
		return
	}
	const slots = await inventoryCollection()
	await slots.insertMany(docs as InventorySlotDocument[])
}
