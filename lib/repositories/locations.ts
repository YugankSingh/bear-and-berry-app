import { ObjectId } from "mongodb"
import { locationsCollection } from "@/lib/db/collections"
import { mapLocation } from "@/lib/db/mappers"
import type { LocationDocument } from "@/lib/db/documents"
import type { LocationCreateInput, LocationPatchInput } from "@/lib/validations/location"
import type { LocationRecord } from "@/types/domain"

export async function listLocations(): Promise<LocationRecord[]> {
	const locations = await locationsCollection()
	const docs = await locations.find({}).sort({ name: 1 }).toArray()
	return docs.map(mapLocation)
}

export async function createLocation(input: LocationCreateInput): Promise<LocationRecord> {
	const locations = await locationsCollection()
	const now = new Date()
	const doc: Omit<LocationDocument, "_id"> = {
		name: input.name,
		city: input.city,
		address: input.address ?? null,
		siteType: input.siteType,
		footfallDaily: input.footfallDaily ?? null,
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
	const $set: Partial<LocationDocument> = { updatedAt: new Date() }

	if (input.name !== undefined) $set.name = input.name
	if (input.city !== undefined) $set.city = input.city
	if (input.address !== undefined) $set.address = input.address
	if (input.siteType !== undefined) $set.siteType = input.siteType
	if (input.footfallDaily !== undefined) $set.footfallDaily = input.footfallDaily

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
