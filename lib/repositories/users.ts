import { randomBytes } from "crypto"
import { ObjectId } from "mongodb"
import { usersCollection } from "@/lib/db/collections"
import { mapUser } from "@/lib/db/mappers"
import { hashPassword } from "@/lib/auth/password"
import { roleHasPermission } from "@/lib/auth/permissions"
import { findRoleBySlug, listRoles } from "@/lib/repositories/roles"
import { membershipsForUser } from "@/lib/auth/membership"
import { normalizeMemberships } from "@/lib/auth/grants"
import type { UserDocument } from "@/lib/db/documents"
import { SYSTEM_ADMIN_PERMISSION, type AccessStatus, type Permission, type Role, type UserRecord, type OrgMembership, type AccessGrant } from "@/types/domain"

export type UserWriteInput = {
	name: string
	email: string
	password?: string
	role: Role
	orgId: string | null
	orgSlug: string
	tags?: string[]
	accessStatus?: AccessStatus
	emailVerified?: boolean
	passwordReady?: boolean
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | null
	inviteAcceptedAt?: Date | null
	memberships?: OrgMembership[]
	extraGrants?: AccessGrant[]
}

export type UserPatchInput = {
	name?: string
	role?: Role
	orgId?: string | null
	orgSlug?: string
	tags?: string[]
	isActive?: boolean
	password?: string
	accessStatus?: AccessStatus
	emailVerified?: boolean
	passwordReady?: boolean
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | null
	inviteAcceptedAt?: Date | null
	emailOtpHash?: string | null
	emailOtpExpiresAt?: Date | null
	deletedAt?: Date | null
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

export async function countLiveUsers(): Promise<number> {
	const users = await usersCollection()
	return users.countDocuments(LIVE_USER_FILTER)
}

export type UserListOptions = {
	orgSlug?: string
}

/** Team members only — pending access requests are listed separately. */
export async function listUsers(options: UserListOptions = {}): Promise<UserRecord[]> {
	const users = await usersCollection()
	const base = { ...LIVE_USER_FILTER, accessStatus: { $ne: "waitlisted" as const } }
	const filter = options.orgSlug
		? {
				...base,
				$or: [
					{ orgSlug: options.orgSlug },
					{ "memberships.org": options.orgSlug },
					{ "memberships.org": "*" },
				],
			}
		: base
	const docs = await users.find(filter).sort({ createdAt: -1 }).toArray()
	return toUserRecords(docs)
}

export async function listAccessRequests(): Promise<UserRecord[]> {
	const users = await usersCollection()
	const docs = await users
		.find({ ...LIVE_USER_FILTER, accessStatus: "waitlisted" })
		.sort({ createdAt: -1 })
		.toArray()
	return toUserRecords(docs)
}

/** Pending access requests carry no role, org, membership, or grants until approved. */
export async function stripPendingAccessRequestGrants(): Promise<void> {
	const users = await usersCollection()
	await users.updateMany(
		{ accessStatus: "waitlisted" },
		{
			$set: { role: "", orgId: null, orgSlug: "", memberships: [], extraGrants: [] },
			$pull: { tags: "waitlist" },
		},
	)
}

export async function countLiveSystemAdmins(): Promise<number> {
	const roles = await listRoles()
	const adminRoleSlugs = roles
		.filter((role) => roleHasPermission(role, SYSTEM_ADMIN_PERMISSION))
		.map((role) => role.slug)
	if (adminRoleSlugs.length === 0) {
		return 0
	}
	const users = await usersCollection()
	return users.countDocuments({
		...LIVE_USER_FILTER,
		isActive: true,
		role: { $in: adminRoleSlugs },
	})
}

async function resolveStoredMemberships(
	input: UserWriteInput,
	rolePermissions: readonly Permission[],
): Promise<OrgMembership[]> {
	if (input.memberships?.length) {
		return normalizeMemberships(input.memberships)
	}
	return membershipsForUser({
		roleSlug: input.role,
		rolePermissions,
		homeOrgSlug: input.orgSlug,
	})
}

export async function createUser(input: UserWriteInput): Promise<UserRecord> {
	const users = await usersCollection()
	const role = await findRoleBySlug(input.role)
	const now = new Date()
	const passwordReady = input.passwordReady ?? Boolean(input.password)
	const doc: Omit<UserDocument, "_id"> = {
		name: input.name,
		email: input.email.toLowerCase(),
		passwordHash: await hashPassword(input.password ?? randomBytes(32).toString("hex")),
		role: input.role,
		orgId: input.orgId ? new ObjectId(input.orgId) : null,
		orgSlug: input.orgSlug,
		tags: input.tags ?? [],
		isActive: true,
		accessStatus: input.accessStatus ?? "invited",
		memberships: await resolveStoredMemberships(input, role?.permissions ?? []),
		extraGrants: input.extraGrants ?? [],
		emailVerified: input.emailVerified ?? false,
		passwordReady,
		inviteExpiresAt: input.inviteExpiresAt ?? null,
		inviteAcceptedAt: input.inviteAcceptedAt ?? null,
		deletedAt: null,
		createdAt: now,
		updatedAt: now,
		...(input.inviteTokenHash ? { inviteTokenHash: input.inviteTokenHash } : {}),
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
	const $unset: Record<string, ""> = {}

	if (input.name !== undefined) $set.name = input.name
	if (input.role !== undefined) $set.role = input.role
	if (input.orgId !== undefined) $set.orgId = input.orgId ? new ObjectId(input.orgId) : null
	if (input.orgSlug !== undefined) $set.orgSlug = input.orgSlug
	if (input.tags !== undefined) $set.tags = input.tags
	if (input.isActive !== undefined) $set.isActive = input.isActive
	if (input.deletedAt !== undefined) $set.deletedAt = input.deletedAt
	if (input.accessStatus !== undefined) $set.accessStatus = input.accessStatus
	if (input.emailVerified !== undefined) $set.emailVerified = input.emailVerified
	if (input.passwordReady !== undefined) $set.passwordReady = input.passwordReady
	if (input.inviteTokenHash !== undefined) {
		if (input.inviteTokenHash) {
			$set.inviteTokenHash = input.inviteTokenHash
		} else {
			$unset.inviteTokenHash = ""
		}
	}
	if (input.inviteExpiresAt !== undefined) $set.inviteExpiresAt = input.inviteExpiresAt
	if (input.inviteAcceptedAt !== undefined) $set.inviteAcceptedAt = input.inviteAcceptedAt
	if (input.emailOtpHash !== undefined) $set.emailOtpHash = input.emailOtpHash
	if (input.emailOtpExpiresAt !== undefined) $set.emailOtpExpiresAt = input.emailOtpExpiresAt
	if (input.memberships !== undefined) $set.memberships = normalizeMemberships(input.memberships)
	if (input.extraGrants !== undefined) $set.extraGrants = input.extraGrants
	if (input.password) {
		$set.passwordHash = await hashPassword(input.password)
		$set.passwordReady = true
	}

	const update: { $set: Partial<UserDocument>; $unset?: Record<string, ""> } = { $set }
	if (Object.keys($unset).length > 0) {
		update.$unset = $unset
	}

	const result = await users.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		update,
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
				inviteExpiresAt: null,
				emailOtpHash: null,
				emailOtpExpiresAt: null,
				updatedAt: now,
			},
			$unset: { inviteTokenHash: "" },
		},
		{ returnDocument: "after" },
	)

	return result ? toUserRecord(result) : null
}
