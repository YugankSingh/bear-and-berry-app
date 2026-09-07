import { randomBytes } from "crypto"
import { ObjectId } from "mongodb"
import { usersCollection } from "@/lib/db/collections"
import { mapUser } from "@/lib/db/mappers"
import { hashPassword } from "@/lib/auth/password"
import { isSystemAdmin, normalizePermissions } from "@/lib/auth/permissions"
import { findRoleBySlug, listRoles } from "@/lib/repositories/roles"
import type { UserDocument } from "@/lib/db/documents"
import type { AccessStatus, Permission, ResourceAccess, Role, UserRecord, OrgMembership, AccessGrant } from "@/types/domain"
import { ALL_RESOURCE_ACCESS, resolveResourceAccess, scopePathForAccess } from "@/lib/auth/resource-access"
import { membershipsFromAccess } from "@/lib/auth/compile-grants"
import { normalizeMemberships } from "@/lib/auth/grants"

export type UserWriteInput = {
	name: string
	email: string
	password?: string
	role: Role
	orgId: string
	orgSlug: string
	organization?: string | null
	scopePath?: string
	tags?: string[]
	accessStatus?: AccessStatus
	resourceAccess?: ResourceAccess
	emailVerified?: boolean
	passwordReady?: boolean
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | null
	inviteAcceptedAt?: Date | null
	extraPermissions?: Permission[]
	memberships?: OrgMembership[]
	extraGrants?: AccessGrant[]
}

export type UserPatchInput = {
	name?: string
	role?: Role
	orgId?: string
	orgSlug?: string
	organization?: string | null
	scopePath?: string
	tags?: string[]
	isActive?: boolean
	password?: string
	accessStatus?: AccessStatus
	resourceAccess?: ResourceAccess
	emailVerified?: boolean
	passwordReady?: boolean
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | null
	inviteAcceptedAt?: Date | null
	emailOtpHash?: string | null
	emailOtpExpiresAt?: Date | null
	deletedAt?: Date | null
	extraPermissions?: Permission[]
	memberships?: OrgMembership[]
	extraGrants?: AccessGrant[]
}

const LIVE_USER_FILTER = { deletedAt: null } as const

export async function toUserRecord(doc: UserDocument): Promise<UserRecord> {
	return mapUser(doc, await findRoleBySlug(doc.role))
}

async function toUserRecords(docs: UserDocument[]): Promise<UserRecord[]> {
	const roles = await listRoles()
	const bySlug = new Map(roles.map((role) => [role.slug, role]))
	return docs.map((doc) => mapUser(doc, bySlug.get(doc.role) ?? null))
}

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

export async function findUserByInviteTokenHash(tokenHash: string): Promise<UserDocument | null> {
	const users = await usersCollection()
	return users.findOne({ inviteTokenHash: tokenHash, ...LIVE_USER_FILTER })
}

export async function countUsers(): Promise<number> {
	const users = await usersCollection()
	return users.countDocuments()
}

export async function listUsers(): Promise<UserRecord[]> {
	const users = await usersCollection()
	const docs = await users.find(LIVE_USER_FILTER).sort({ createdAt: -1 }).toArray()
	return toUserRecords(docs)
}

export async function countLiveSystemAdmins(): Promise<number> {
	const users = await usersCollection()
	const docs = await users.find({ ...LIVE_USER_FILTER, isActive: true }).toArray()
	const records = await toUserRecords(docs)
	return records.filter((user) => isSystemAdmin(user)).length
}

export async function createUser(input: UserWriteInput): Promise<UserRecord> {
	const users = await usersCollection()
	const now = new Date()
	const passwordReady = input.passwordReady ?? Boolean(input.password)
	const doc: Omit<UserDocument, "_id"> = {
		name: input.name,
		email: input.email.toLowerCase(),
		passwordHash: await hashPassword(input.password ?? randomBytes(32).toString("hex")),
		role: input.role,
		orgId: new ObjectId(input.orgId),
		orgSlug: input.orgSlug,
		organization: input.organization ?? null,
		scopePath: input.scopePath ?? scopePathForAccess(input.resourceAccess ?? ALL_RESOURCE_ACCESS),
		tags: input.tags ?? [],
		isActive: true,
		accessStatus: input.accessStatus ?? "invited",
		resourceAccess: resolveResourceAccess({
			resourceAccess: input.resourceAccess,
			scopePath: input.scopePath,
			orgSlug: input.orgSlug,
			extraPermissions: input.extraPermissions,
		}),
		emailVerified: input.emailVerified ?? false,
		passwordReady,
		inviteTokenHash: input.inviteTokenHash ?? null,
		inviteExpiresAt: input.inviteExpiresAt ?? null,
		inviteAcceptedAt: input.inviteAcceptedAt ?? null,
		extraPermissions: normalizePermissions(input.extraPermissions),
		memberships: normalizeMemberships(
			Array.isArray(input.memberships)
				? input.memberships
				: membershipsFromAccess({
					role: input.role,
					resourceAccess: input.resourceAccess,
					orgSlug: input.orgSlug,
					permissions: input.extraPermissions,
				}),
		),
		extraGrants: input.extraGrants ?? [],
		deletedAt: null,
		createdAt: now,
		updatedAt: now,
	}
	const result = await users.insertOne(doc as UserDocument)
	return toUserRecord({ ...doc, _id: result.insertedId })
}

export async function updateUser(id: string, input: UserPatchInput): Promise<UserRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}

	const users = await usersCollection()
	const $set: Partial<UserDocument> = {
		updatedAt: new Date(),
	}

	if (input.name !== undefined) $set.name = input.name
	if (input.role !== undefined) $set.role = input.role
	if (input.orgId !== undefined) $set.orgId = new ObjectId(input.orgId)
	if (input.orgSlug !== undefined) $set.orgSlug = input.orgSlug
	if (input.organization !== undefined) $set.organization = input.organization
	if (input.scopePath !== undefined) $set.scopePath = input.scopePath
	if (input.tags !== undefined) $set.tags = input.tags
	if (input.isActive !== undefined) $set.isActive = input.isActive
	if (input.deletedAt !== undefined) $set.deletedAt = input.deletedAt
	if (input.accessStatus !== undefined) $set.accessStatus = input.accessStatus
	if (input.emailVerified !== undefined) $set.emailVerified = input.emailVerified
	if (input.passwordReady !== undefined) $set.passwordReady = input.passwordReady
	if (input.inviteTokenHash !== undefined) $set.inviteTokenHash = input.inviteTokenHash
	if (input.inviteExpiresAt !== undefined) $set.inviteExpiresAt = input.inviteExpiresAt
	if (input.inviteAcceptedAt !== undefined) $set.inviteAcceptedAt = input.inviteAcceptedAt
	if (input.emailOtpHash !== undefined) $set.emailOtpHash = input.emailOtpHash
	if (input.emailOtpExpiresAt !== undefined) $set.emailOtpExpiresAt = input.emailOtpExpiresAt
	if (input.extraPermissions !== undefined) $set.extraPermissions = normalizePermissions(input.extraPermissions)
	if (input.memberships !== undefined) $set.memberships = normalizeMemberships(input.memberships)
	if (input.extraGrants !== undefined) $set.extraGrants = input.extraGrants
	if (input.resourceAccess !== undefined) {
		$set.resourceAccess = input.resourceAccess
		$set.scopePath = scopePathForAccess(input.resourceAccess)
	}
	if (input.password) {
		$set.passwordHash = await hashPassword(input.password)
		$set.passwordReady = true
	}

	const result = await users.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set },
		{ returnDocument: "after" },
	)

	return result ? toUserRecord(result) : null
}

export async function softDeleteUser(id: string): Promise<UserRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}

	const users = await usersCollection()
	const now = new Date()
	const result = await users.findOneAndUpdate(
		{ _id: new ObjectId(id), ...LIVE_USER_FILTER },
		{
			$set: {
				deletedAt: now,
				isActive: false,
				inviteTokenHash: null,
				inviteExpiresAt: null,
				emailOtpHash: null,
				emailOtpExpiresAt: null,
				updatedAt: now,
			},
		},
		{ returnDocument: "after" },
	)

	return result ? toUserRecord(result) : null
}
