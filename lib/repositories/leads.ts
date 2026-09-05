import { ObjectId } from "mongodb"
import { leadsCollection } from "@/lib/db/collections"
import { mapLead } from "@/lib/db/mappers"
import type { LeadDocument } from "@/lib/db/documents"
import { normalizeLeadPayload, type LeadIngestInput } from "@/lib/validations/lead"
import type { LeadRecord, LeadStatus } from "@/types/domain"

export async function createLead(input: LeadIngestInput): Promise<LeadRecord> {
	const leads = await leadsCollection()
	const now = new Date()
	const normalized = normalizeLeadPayload(input)
	const doc: Omit<LeadDocument, "_id"> = {
		...normalized,
		status: "new",
		createdAt: now,
		updatedAt: now,
	}
	const result = await leads.insertOne(doc as LeadDocument)
	return mapLead({ ...doc, _id: result.insertedId })
}

export async function listLeads(): Promise<LeadRecord[]> {
	const leads = await leadsCollection()
	const docs = await leads.find({}).sort({ createdAt: -1 }).limit(200).toArray()
	return docs.map(mapLead)
}

export async function updateLeadStatus(
	id: string,
	status: LeadStatus,
): Promise<LeadRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}
	const leads = await leadsCollection()
	const result = await leads.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set: { status, updatedAt: new Date() } },
		{ returnDocument: "after" },
	)
	return result ? mapLead(result) : null
}

export async function countLeadsByStatus(): Promise<Record<LeadStatus, number>> {
	const leads = await leadsCollection()
	const groups = await leads
		.aggregate<{ _id: LeadStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }])
		.toArray()

	const counts: Record<LeadStatus, number> = {
		new: 0,
		contacted: 0,
		qualified: 0,
		closed: 0,
	}

	for (const group of groups) {
		counts[group._id] = group.count
	}

	return counts
}
