import { ObjectId } from "mongodb"
import { leadRecipientsCollection } from "@/lib/db/collections"
import { toIso } from "@/lib/db/mappers"
import type { LeadRecipientDocument } from "@/lib/db/documents"
import type { LeadRecipientRecord } from "@/types/domain"

const INITIAL_RECIPIENTS = ["yuganksingh05@gmail.com", "badbudarsingh@gmail.com"]

function mapRecipient(doc: LeadRecipientDocument): LeadRecipientRecord {
	return {
		id: doc._id.toHexString(),
		email: doc.email,
		tags: doc.tags ?? [],
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export async function listLeadRecipients(): Promise<LeadRecipientRecord[]> {
	const recipients = await leadRecipientsCollection()
	const docs = await recipients.find({}).sort({ email: 1 }).toArray()
	return docs.map(mapRecipient)
}

export async function seedLeadRecipientsIfEmpty(): Promise<void> {
	const recipients = await leadRecipientsCollection()
	if ((await recipients.countDocuments()) > 0) {
		return
	}
	const now = new Date()
	await recipients.insertMany(
		INITIAL_RECIPIENTS.map((email) => ({
			email,
			tags: [],
			createdAt: now,
			updatedAt: now,
		})) as LeadRecipientDocument[],
	)
}

export async function listLeadRecipientEmails(): Promise<string[]> {
	const recipients = await listLeadRecipients()
	return recipients.map((item) => item.email)
}

export async function addLeadRecipient(email: string): Promise<LeadRecipientRecord> {
	const recipients = await leadRecipientsCollection()
	const normalized = email.trim().toLowerCase()
	const existing = await recipients.findOne({ email: normalized })
	if (existing) {
		return mapRecipient(existing)
	}
	const now = new Date()
	const doc: Omit<LeadRecipientDocument, "_id"> = {
		email: normalized,
		tags: [],
		createdAt: now,
		updatedAt: now,
	}
	const result = await recipients.insertOne(doc as LeadRecipientDocument)
	return mapRecipient({ ...doc, _id: result.insertedId })
}

export async function removeLeadRecipient(id: string): Promise<boolean> {
	if (!ObjectId.isValid(id)) {
		return false
	}
	const recipients = await leadRecipientsCollection()
	const result = await recipients.deleteOne({ _id: new ObjectId(id) })
	return result.deletedCount > 0
}
