import { organizationsCollection } from "@/lib/db/collections"
import { mapOrganization } from "@/lib/db/mappers"
import type { OrganizationDocument } from "@/lib/db/documents"
import type { OrgKind, OrganizationRecord } from "@/types/domain"

function uniqueTags(tags: readonly string[]): string[] {
	const seen = new Set<string>()
	const result: string[] = []
	for (const tag of tags) {
		const next = tag.trim()
		if (!next || seen.has(next)) {
			continue
		}
		seen.add(next)
		result.push(next)
	}
	return result
}

export async function listOrganizations(): Promise<OrganizationRecord[]> {
	const orgs = await organizationsCollection()
	const docs = await orgs.find({}).sort({ name: 1 }).toArray()
	return docs.map(mapOrganization)
}

export async function countOrganizations(): Promise<number> {
	const orgs = await organizationsCollection()
	return orgs.countDocuments()
}

export async function findOrganizationBySlug(slug: string): Promise<OrganizationDocument | null> {
	const orgs = await organizationsCollection()
	return orgs.findOne({ slug })
}

export async function updateOrganization(
	slug: string,
	input: {
		name?: string
		kind?: OrgKind
	},
): Promise<OrganizationRecord | null> {
	const orgs = await organizationsCollection()
	const $set: Partial<OrganizationDocument> = { updatedAt: new Date() }
	if (input.name !== undefined) $set.name = input.name
	if (input.kind !== undefined) $set.kind = input.kind
	const result = await orgs.findOneAndUpdate({ slug }, { $set }, { returnDocument: "after" })
	return result ? mapOrganization(result) : null
}

export async function addOrganizationTag(slug: string, tag: string): Promise<OrganizationRecord | null> {
	const orgs = await organizationsCollection()
	const existing = await orgs.findOne({ slug })
	if (!existing) {
		return null
	}
	const next = uniqueTags([...existing.tags, tag])
	if (next.length === existing.tags.length) {
		return mapOrganization(existing)
	}
	const result = await orgs.findOneAndUpdate(
		{ slug },
		{ $set: { tags: next, updatedAt: new Date() } },
		{ returnDocument: "after" },
	)
	return result ? mapOrganization(result) : null
}

export async function removeOrganizationTag(
	slug: string,
	tag: string,
): Promise<OrganizationRecord | null> {
	const orgs = await organizationsCollection()
	const result = await orgs.findOneAndUpdate(
		{ slug },
		{ $pull: { tags: tag }, $set: { updatedAt: new Date() } },
		{ returnDocument: "after" },
	)
	return result ? mapOrganization(result) : null
}

/** Returns null when the slug is already taken. */
export async function createOrganization(input: {
	slug: string
	name: string
	kind: OrgKind
	tags?: readonly string[]
}): Promise<OrganizationRecord | null> {
	const orgs = await organizationsCollection()
	if (await orgs.findOne({ slug: input.slug })) {
		return null
	}
	const now = new Date()
	const doc: Omit<OrganizationDocument, "_id"> = {
		slug: input.slug,
		name: input.name,
		kind: input.kind,
		tags: uniqueTags(input.tags ?? []),
		createdAt: now,
		updatedAt: now,
	}
	const result = await orgs.insertOne(doc as OrganizationDocument)
	return mapOrganization({ ...doc, _id: result.insertedId })
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
		tags: uniqueTags(input.tags ?? []),
		createdAt: now,
		updatedAt: now,
	}
	const result = await orgs.insertOne(doc as OrganizationDocument)
	return mapOrganization({ ...doc, _id: result.insertedId })
}