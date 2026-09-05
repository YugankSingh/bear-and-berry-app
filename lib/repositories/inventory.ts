import { ObjectId } from "mongodb"
import { inventoryCollection, machinesCollection } from "@/lib/db/collections"
import { mapInventorySlot } from "@/lib/db/mappers"
import type { InventorySlotDocument } from "@/lib/db/documents"
import type { InventorySlotRecord } from "@/types/domain"

export async function listInventory(): Promise<InventorySlotRecord[]> {
	const [slots, machines] = await Promise.all([inventoryCollection(), machinesCollection()])
	const docs = await slots.find({}).sort({ machineId: 1, slotIndex: 1 }).toArray()
	const machineDocs = await machines.find({}).toArray()
	const names = new Map(machineDocs.map((machine) => [machine._id.toHexString(), machine.name]))

	return docs.map((doc) =>
		mapInventorySlot(doc, names.get(doc.machineId.toHexString()) ?? "Unknown machine"),
	)
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
