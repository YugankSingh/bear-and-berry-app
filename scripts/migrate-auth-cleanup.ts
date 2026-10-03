/**
 * Drops legacy auth fields from user documents and backfills memberships from orgSlug.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json scripts/migrate-auth-cleanup.ts .env.staging
 *   npx tsx --tsconfig tsconfig.json scripts/migrate-auth-cleanup.ts .env.prod
 */
import { readFileSync } from "fs"
import { resolve } from "path"
import { usersCollection } from "@/lib/db/collections"
import { GRANT_WILDCARD } from "@/lib/auth/grants"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { roleNeedsOrganization } from "@/lib/auth/permission-scopes"
import { roleHasAllOrganizations, isOwnerRole } from "@/lib/auth/permissions"
import { getAppEnvironment, getMongoDbName } from "@/lib/env"

function loadEnvFile(filePath: string): void {
	const absolute = resolve(process.cwd(), filePath)
	const text = readFileSync(absolute, "utf8")
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith("#")) {
			continue
		}
		const equals = trimmed.indexOf("=")
		if (equals <= 0) {
			continue
		}
		const key = trimmed.slice(0, equals).trim()
		let value = trimmed.slice(equals + 1).trim()
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1)
		}
		process.env[key] = value
	}
}

async function main() {
	const envFile = process.argv[2]
	if (!envFile) {
		throw new Error("Pass an env file path, e.g. .env.staging or .env.prod")
	}
	loadEnvFile(envFile)

	const appEnv = getAppEnvironment()
	const dbName = getMongoDbName()
	console.log(`Starting auth cleanup · APP_ENV=${appEnv} · db=${dbName} · envFile=${envFile}`)

	const users = await usersCollection()
	const docs = await users.find({}).toArray()
	let updated = 0
	let backfilled = 0

	for (const doc of docs) {
		const role = await findRoleBySlug(doc.role)
		let memberships = doc.memberships ?? []
		const hadMemberships = memberships.length > 0
		if (!hadMemberships && role) {
			if (isOwnerRole(role) || roleHasAllOrganizations(role)) {
				memberships = [{ org: GRANT_WILDCARD, orgTag: null, role: doc.role }]
			} else if (roleNeedsOrganization(role) && doc.orgSlug) {
				memberships = [{ org: doc.orgSlug, orgTag: null, role: doc.role }]
			}
			if (memberships.length > 0) {
				backfilled += 1
			}
		}

		await users.updateOne(
			{ _id: doc._id },
			{
				$set: { memberships, extraGrants: doc.extraGrants ?? [] },
				$unset: {
					resourceAccess: "",
					extraPermissions: "",
					scopePath: "",
					organization: "",
				},
			},
		)
		updated += 1
	}

	console.log(`Migrated ${updated} user document(s); backfilled memberships on ${backfilled}.`)
	process.exit(0)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
