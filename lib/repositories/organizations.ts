import { organizationsCollection } from "@/lib/db/collections"
import { mapOrganization } from "@/lib/db/mappers"
import type { OrganizationDocument } from "@/lib/db/documents"
import type { OrgKind, OrganizationRecord } from "@/types/domain"

export async function listOrganizations(): Promise<OrganizationRecord[]> {
	const orgs = await organizationsCollection()
	const docs = await orgs.find({}).sort({ name: 1 }).toArray()
	return docs.map(mapOrganization)
}

export async function findOrganizationBySlug(slug: string): Promise<OrganizationDocument | null> {
	const orgs = await organizationsCollection()
	return orgs.findOne({ slug })
}

export async function upsertOrganization(input: {
	slug: string
	name: string
	kind: OrgKind
	tags?: string[]
}): Promise<OrganizationRecord> {
	const orgs = await organizationsCollection()
	const now = new Date()
	const existing = await orgs.findOne({ slug: input.slug })
	if (existing) {
		return mapOrganization(existing)
	}
	const doc: Omit<OrganizationDocument, "_id"> = {
		slug: input.slug,
		name: input.name,
		kind: input.kind,
		tags: input.tags ?? [],
		createdAt: now,
		updatedAt: now,
	}
	const result = await orgs.insertOne(doc as OrganizationDocument)
	return mapOrganization({ ...doc, _id: result.insertedId })
}