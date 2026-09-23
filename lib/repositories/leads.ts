import { ObjectId } from "mongodb"
import { leadsCollection } from "@/lib/db/collections"
import { mapLead } from "@/lib/db/mappers"
import type { LeadCommentDocument, LeadDocument } from "@/lib/db/documents"
import { normalizeLeadPayload, type LeadIngestInput } from "@/lib/validations/lead"
import type { LeadRecord, LeadStatus } from "@/types/domain"

const ACTIVE_FILTER = {
	$or: [{ archivedAt: { $exists: false } }, { archivedAt: null }],
}

const ARCHIVED_FILTER = { archivedAt: { $type: "date" as const } }

function leadObjectId(id: string): ObjectId | null {
	if (!ObjectId.isValid(id)) {
		return null
	}
	return new ObjectId(id)
}

export async function createLead(input: LeadIngestInput): Promise<LeadRecord> {
	const leads = await leadsCollection()
	const now = new Date()
	const normalized = normalizeLeadPayload(input)
	const doc: Omit<LeadDocument, "_id"> = {
		...normalized,
		status: "new",
		archivedAt: null,
		comments: [],
		createdAt: now,
		updatedAt: now,
	}
	const result = await leads.insertOne(doc as LeadDocument)
	return mapLead({ ...doc, _id: result.insertedId })
}

export async function listLeads(options: { archived?: boolean; limit?: number } = {}): Promise<LeadRecord[]> {
	const leads = await leadsCollection()
	const filter = options.archived ? ARCHIVED_FILTER : ACTIVE_FILTER
	const docs = await leads
		.find(filter)
		.sort({ createdAt: -1 })
		.limit(options.limit ?? 200)
		.toArray()
	return docs.map(mapLead)
}

export async function getLeadById(id: string): Promise<LeadRecord | null> {
	const objectId = leadObjectId(id)
	if (!objectId) {
		return null
	}
	const leads = await leadsCollection()
	const doc = await leads.findOne({ _id: objectId })
	return doc ? mapLead(doc) : null
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<LeadRecord | null> {
	const objectId = leadObjectId(id)
	if (!objectId) {
		return null
	}
	const leads = await leadsCollection()
	const result = await leads.findOneAndUpdate(
		{ _id: objectId },
		{ $set: { status, updatedAt: new Date() } },
		{ returnDocument: "after" },
	)
	return result ? mapLead(result) : null
}

export async function setLeadArchived(id: string, archived: boolean): Promise<LeadRecord | null> {
	const objectId = leadObjectId(id)
	if (!objectId) {
		return null
	}
	const leads = await leadsCollection()
	const result = await leads.findOneAndUpdate(
		{ _id: objectId },
		{ $set: { archivedAt: archived ? new Date() : null, updatedAt: new Date() } },
		{ returnDocument: "after" },
	)
	return result ? mapLead(result) : null
}

export async function addLeadComment(input: {
	id: string
	body: string
	authorId: string
	authorName: string
}): Promise<LeadRecord | null> {
	const objectId = leadObjectId(input.id)
	if (!objectId) {
		return null
	}

	const comment: LeadCommentDocument = {
		id: new ObjectId().toHexString(),
		body: input.body,
		authorId: input.authorId,
		authorName: input.authorName,
		createdAt: new Date(),
	}

	const leads = await leadsCollection()
	const result = await leads.findOneAndUpdate(
		{ _id: objectId },
		{
			$push: { comments: comment },
			$set: { updatedAt: new Date() },
		},
		{ returnDocument: "after" },
	)
	return result ? mapLead(result) : null
}

export async function countLeadsByStatus(): Promise<Record<LeadStatus, number>> {
	const leads = await leadsCollection()
	const groups = await leads
		.aggregate<{ _id: LeadStatus; count: number }>([
			{ $match: ACTIVE_FILTER },
			{ $group: { _id: "$status", count: { $sum: 1 } } },
		])
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
