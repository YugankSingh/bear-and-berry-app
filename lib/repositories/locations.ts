import { ObjectId } from "mongodb"
import { locationsCollection } from "@/lib/db/collections"
import { mapLocation } from "@/lib/db/mappers"
import { joinScopePath } from "@/lib/auth/scope"
import type { LocationDocument } from "@/lib/db/documents"
import type { LocationCreateInput, LocationPatchInput } from "@/lib/validations/location"
import type { LocationRecord } from "@/types/domain"

export async function listLocations(): Promise<LocationRecord[]> {
	const locations = await locationsCollection()
	const docs = await locations.find({}).sort({ name: 1 }).toArray()
	return docs.map(mapLocation)
}

export async function createLocation(
	input: LocationCreateInput,
	orgId: string,
): Promise<LocationRecord> {
	const locations = await locationsCollection()
	const now = new Date()
	const path = joinScopePath([
		input.orgSlug,
		input.region,
		input.city,
		input.name,
	])
	const doc: Omit<LocationDocument, "_id"> = {
		name: input.name,
		city: input.city,
		region: input.region,
		address: input.address ?? null,
		siteType: input.siteType,
		footfallDaily: input.footfallDaily ?? null,
		orgId: new ObjectId(orgId),
		path,
		tags: input.tags ?? [],
		createdAt: now,
		updatedAt: now,
	}
	const result = await locations.insertOne(doc as LocationDocument)
	return mapLocation({ ...doc, _id: result.insertedId })
}

export async function updateLocation(
	id: string,
	input: LocationPatchInput,
): Promise<LocationRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}

	const locations = await locationsCollection()
	const current = await locations.findOne({ _id: new ObjectId(id) })
	if (!current) {
		return null
	}

	const $set: Partial<LocationDocument> = { updatedAt: new Date() }
	if (input.name !== undefined) $set.name = input.name
	if (input.city !== undefined) $set.city = input.city
	if (input.region !== undefined) $set.region = input.region
	if (input.address !== undefined) $set.address = input.address
	if (input.siteType !== undefined) $set.siteType = input.siteType
	if (input.footfallDaily !== undefined) $set.footfallDaily = input.footfallDaily
	if (input.tags !== undefined) $set.tags = input.tags

	const nextName = input.name ?? current.name
	const nextCity = input.city ?? current.city
	const nextRegion = input.region ?? current.region
	const orgSlug = current.path.split("/").filter(Boolean)[0] ?? "bear-and-berry"
	$set.path = joinScopePath([orgSlug, nextRegion, nextCity, nextName])

	const result = await locations.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set },
		{ returnDocument: "after" },
	)
	return result ? mapLocation(result) : null
}

export async function findLocationsByIds(
	ids: ObjectId[],
): Promise<Map<string, LocationRecord>> {
	if (ids.length === 0) {
		return new Map()
	}
	const locations = await locationsCollection()
	const docs = await locations.find({ _id: { $in: ids } }).toArray()
	return new Map(docs.map((doc) => [doc._id.toHexString(), mapLocation(doc)]))
}