import { ObjectId } from "mongodb"
import { usersCollection } from "@/lib/db/collections"
import { mapUser } from "@/lib/db/mappers"
import { hashPassword } from "@/lib/auth/password"
import type { UserDocument } from "@/lib/db/documents"
import type { UserCreateInput, UserPatchInput } from "@/lib/validations/user"
import type { UserRecord } from "@/types/domain"

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
	const users = await usersCollection()
	return users.findOne({ email: email.toLowerCase() })
}

export async function findUserById(id: string): Promise<UserDocument | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}
	const users = await usersCollection()
	return users.findOne({ _id: new ObjectId(id) })
}

export async function countUsers(): Promise<number> {
	const users = await usersCollection()
	return users.countDocuments()
}

export async function listUsers(): Promise<UserRecord[]> {
	const users = await usersCollection()
	const docs = await users.find({}).sort({ createdAt: -1 }).toArray()
	return docs.map(mapUser)
}

export async function createUser(input: UserCreateInput): Promise<UserRecord> {
	const users = await usersCollection()
	const now = new Date()
	const doc: Omit<UserDocument, "_id"> = {
		name: input.name,
		email: input.email.toLowerCase(),
		passwordHash: await hashPassword(input.password),
		role: input.role,
		organization: input.organization ?? null,
		isActive: true,
		createdAt: now,
		updatedAt: now,
	}
	const result = await users.insertOne(doc as UserDocument)
	return mapUser({ ...doc, _id: result.insertedId })
}

export async function updateUser(id: string, input: UserPatchInput): Promise<UserRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}

	const users = await usersCollection()
	const $set: Partial<UserDocument> = {
		updatedAt: new Date(),
	}

	if (input.name !== undefined) {
		$set.name = input.name
	}
	if (input.role !== undefined) {
		$set.role = input.role
	}
	if (input.organization !== undefined) {
		$set.organization = input.organization
	}
	if (input.isActive !== undefined) {
		$set.isActive = input.isActive
	}
	if (input.password) {
		$set.passwordHash = await hashPassword(input.password)
	}

	const result = await users.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set },
		{ returnDocument: "after" },
	)

	return result ? mapUser(result) : null
}
