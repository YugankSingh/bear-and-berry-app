import { permissionsCollection, rolesCollection } from "@/lib/db/collections"
import { toIso } from "@/lib/db/mappers"
import { DEFAULT_ROLES } from "@/lib/auth/default-roles"
import {
	PERMISSION_META,
	isOwnerRole,
	normalizePermissions,
	roleHasPermission,
	sanitizeRolePermissions,
} from "@/lib/auth/permissions"
import { ORGS_ALL_PERMISSION, PERMISSIONS, SYSTEM_ADMIN_PERMISSION, type PermissionRecord, type RoleRecord } from "@/types/domain"
import type { RoleDocument } from "@/lib/db/documents"

export function mapRole(doc: RoleDocument): RoleRecord {
	return {
		id: doc._id.toHexString(),
		slug: doc.slug,
		name: doc.name,
		description: doc.description,
		rank: doc.rank,
		permissions: normalizePermissions(doc.permissions),
		isSystem: doc.isSystem,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export async function listRoles(): Promise<RoleRecord[]> {
	const roles = await rolesCollection()
	const docs = await roles.find({}).sort({ rank: -1, name: 1 }).toArray()
	return docs.map(mapRole)
}

export async function findRoleBySlug(slug: string): Promise<RoleRecord | null> {
	const roles = await rolesCollection()
	const doc = await roles.findOne({ slug })
	return doc ? mapRole(doc) : null
}

export async function findSignupRole(): Promise<RoleRecord | null> {
	const roles = await listRoles()
	return (
		roles.find((role) => role.slug === "viewer") ??
		roles
			.filter((role) => !roleHasPermission(role, ORGS_ALL_PERMISSION))
			.sort((left, right) => left.rank - right.rank)[0] ??
		null
	)
}

export async function findSystemAdminRole(): Promise<RoleRecord | null> {
	const roles = await listRoles()
	return (
		roles.find((role) => roleHasPermission(role, SYSTEM_ADMIN_PERMISSION)) ??
		roles.sort((left, right) => right.rank - left.rank)[0] ??
		null
	)
}

export async function createRole(input: {
	slug: string
	name: string
	description?: string
	rank: number
	permissions: readonly string[]
	isSystem?: boolean
}): Promise<RoleRecord> {
	const roles = await rolesCollection()
	const now = new Date()
	const doc: Omit<RoleDocument, "_id"> = {
		slug: input.slug,
		name: input.name,
		description: input.description?.trim() ?? "",
		rank: input.rank,
		permissions: sanitizeRolePermissions(
			{ slug: input.slug, permissions: normalizePermissions(input.permissions) },
			input.permissions,
		),
		isSystem: input.isSystem ?? false,
		createdAt: now,
		updatedAt: now,
	}
	const result = await roles.insertOne(doc as RoleDocument)
	return mapRole({ ...doc, _id: result.insertedId })
}

export async function updateRole(
	slug: string,
	input: {
		name?: string
		description?: string
		rank?: number
		permissions?: readonly string[]
	},
): Promise<RoleRecord | null> {
	const roles = await rolesCollection()
	const $set: Partial<RoleDocument> = { updatedAt: new Date() }
	if (input.name !== undefined) $set.name = input.name
	if (input.description !== undefined) $set.description = input.description
	if (input.rank !== undefined) $set.rank = input.rank
	if (input.permissions !== undefined) {
		const current = await findRoleBySlug(slug)
		$set.permissions = current
			? sanitizeRolePermissions(current, input.permissions)
			: normalizePermissions(input.permissions)
	}
	const result = await roles.findOneAndUpdate({ slug }, { $set }, { returnDocument: "after" })
	return result ? mapRole(result) : null
}

export async function listPermissionCatalog(): Promise<PermissionRecord[]> {
	const permissions = await permissionsCollection()
	const docs = await permissions.find({}).sort({ group: 1, key: 1 }).toArray()
	if (docs.length > 0) {
		return docs.map((doc) => ({
			key: doc.key,
			name: doc.name,
			group: doc.group,
		}))
	}
	return PERMISSIONS.map((key) => ({
		key,
		name: PERMISSION_META[key].name,
		group: PERMISSION_META[key].group,
	}))
}

export async function ensureRbacCatalog(): Promise<void> {
	const [roles, permissions] = await Promise.all([rolesCollection(), permissionsCollection()])
	const now = new Date()

	await Promise.all(
		PERMISSIONS.map(async (key) => {
			const meta = PERMISSION_META[key]
			await permissions.updateOne(
				{ key },
				{
					$set: { name: meta.name, group: meta.group, updatedAt: now },
					$setOnInsert: { key, createdAt: now },
				},
				{ upsert: true },
			)
		}),
	)

	for (const seed of DEFAULT_ROLES) {
		const existing = await roles.findOne({ slug: seed.slug })
		if (existing) {
			if (isOwnerRole(mapRole(existing))) {
				await roles.updateOne(
					{ slug: seed.slug },
					{
						$addToSet: { permissions: { $each: seed.permissions } },
						$set: { updatedAt: now },
					},
				)
			} else {
				const current = mapRole(existing)
				await roles.updateOne(
					{ slug: seed.slug },
					{
						$set: {
							permissions: sanitizeRolePermissions(current, current.permissions),
							updatedAt: now,
						},
					},
				)
			}
			continue
		}
		const doc: Omit<RoleDocument, "_id"> = {
			slug: seed.slug,
			name: seed.name,
			description: seed.description,
			rank: seed.rank,
			permissions: seed.permissions,
			isSystem: seed.isSystem,
			createdAt: now,
			updatedAt: now,
		}
		await roles.insertOne(doc as RoleDocument)
	}

	await roles.updateMany(
		{ slug: { $in: ["super_admin", "admin"] } },
		{ $addToSet: { permissions: "leads:notify" }, $set: { updatedAt: now } },
	)
}
