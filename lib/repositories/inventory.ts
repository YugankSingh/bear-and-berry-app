import { ObjectId } from "mongodb"
import { inventoryCollection, machinesCollection } from "@/lib/db/collections"
import { mapInventorySlot } from "@/lib/db/mappers"
import type { InventorySlotDocument } from "@/lib/db/documents"
import type { InventorySlotRecord } from "@/types/domain"

export type InventoryListOptions = {
	machineIds?: string[]
}

export async function listInventory(options: InventoryListOptions = {}): Promise<InventorySlotRecord[]> {
	const slots = await inventoryCollection()
	const filter =
		options.machineIds && options.machineIds.length > 0
			? {
					machineId: {
						$in: options.machineIds
							.filter((id) => ObjectId.isValid(id))
							.map((id) => new ObjectId(id)),
					},
				}
			: {}
	const docs = await slots.find(filter).sort({ machineId: 1, slotIndex: 1 }).toArray()

	const missingNames = docs.filter((doc) => !doc.machineName)
	if (missingNames.length === 0) {
		return docs.map((doc) => mapInventorySlot(doc))
	}

	// Back-compat for pre-migration slots without denormalized names.
	const machines = await machinesCollection()
	const machineDocs = await machines
		.find({ _id: { $in: missingNames.map((doc) => doc.machineId) } })
		.toArray()
	const names = new Map(machineDocs.map((machine) => [machine._id.toHexString(), machine.name]))
	return docs.map((doc) =>
		mapInventorySlot(doc, doc.machineName || names.get(doc.machineId.toHexString()) || "Unknown machine"),
	)
}

export async function findInventoryById(id: string): Promise<InventorySlotRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}
	const slots = await inventoryCollection()
	const doc = await slots.findOne({ _id: new ObjectId(id) })
	if (!doc) {
		return null
	}
	if (doc.machineName) {
		return mapInventorySlot(doc)
	}
	const machines = await machinesCollection()
	const machine = await machines.findOne({ _id: doc.machineId })
	return mapInventorySlot(doc, machine?.name ?? "Unknown machine")
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
	if (!result) {
		return null
	}

	if (result.machineName) {
		return mapInventorySlot(result)
	}
	const machines = await machinesCollection()
	const machine = await machines.findOne({ _id: result.machineId })
	return mapInventorySlot(result, machine?.name ?? "Unknown machine")
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
