import { ObjectId } from "mongodb"
import { organizationTagsCollection, organizationsCollection, usersCollection } from "@/lib/db/collections"
import type { OrganizationTagDocument } from "@/lib/db/documents"

export type OrganizationTagRecord = {
	tag: string
	organizations: { slug: string; name: string }[]
	createdAt: string
}

export async function listTagCatalog(): Promise<string[]> {
	const tags = await organizationTagsCollection()
	const docs = await tags.find({}, { projection: { tag: 1 } }).sort({ tag: 1 }).toArray()
	return docs.map((doc) => doc.tag)
}

/** Catalog joined with the organizations that currently carry each tag. */
export async function listTagCatalogWithUsage(): Promise<OrganizationTagRecord[]> {
	const [tags, orgs] = await Promise.all([organizationTagsCollection(), organizationsCollection()])
	const [catalog, organizations] = await Promise.all([
		tags.find({}).sort({ tag: 1 }).toArray(),
		orgs.find({}, { projection: { slug: 1, name: 1, tags: 1 } }).sort({ name: 1 }).toArray(),
	])
	return catalog.map((doc) => ({
		tag: doc.tag,
		organizations: organizations
			.filter((org) => org.tags.includes(doc.tag))
			.map((org) => ({ slug: org.slug, name: org.name })),
		createdAt: doc.createdAt.toISOString(),
	}))
}

export async function tagExists(tag: string): Promise<boolean> {
	const tags = await organizationTagsCollection()
	return (await tags.countDocuments({ tag }, { limit: 1 })) > 0
}

/** Idempotent; returns true when the tag was newly added to the catalog. */
export async function createTag(tag: string, createdBy: string | null): Promise<boolean> {
	const tags = await organizationTagsCollection()
	const result = await tags.updateOne(
		{ tag },
		{
			$setOnInsert: {
				tag,
				createdBy: createdBy && ObjectId.isValid(createdBy) ? new ObjectId(createdBy) : null,
				createdAt: new Date(),
			} satisfies Omit<OrganizationTagDocument, "_id">,
		},
		{ upsert: true },
	)
	return result.upsertedCount > 0
}

export async function ensureTags(values: readonly string[], createdBy: string | null): Promise<void> {
	await Promise.all([...new Set(values)].map((tag) => createTag(tag, createdBy)))
}

/** Seeds the catalog from tags already in use on organizations and role bindings. */
export async function backfillTagCatalog(): Promise<void> {
	const [orgs, users] = await Promise.all([organizationsCollection(), usersCollection()])
	const [orgTags, membershipTags, grantTags] = await Promise.all([
		orgs.distinct("tags"),
		users.distinct("memberships.orgTag"),
		users.distinct("extraGrants.orgTag"),
	])
	const inUse = [...orgTags, ...membershipTags, ...grantTags].filter(
		(tag): tag is string => typeof tag === "string" && tag.length > 0 && tag !== "*",
	)
	await ensureTags(inUse, null)
}
