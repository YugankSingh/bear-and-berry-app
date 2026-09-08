import { createUser, findUserByEmail } from "@/lib/repositories/users"
import { findSystemAdminRole } from "@/lib/repositories/roles"
import { findOrganizationBySlug } from "@/lib/repositories/organizations"
import { ALL_RESOURCE_ACCESS } from "@/lib/auth/resource-access"
import { GLOBAL_SCOPE, VENDFORGE_LABS_SLUG } from "@/lib/auth/scope"
import { getEnv } from "@/lib/env"
import type { UserDocument } from "@/lib/db/documents"

export function isSeedAdminEmail(email: string): boolean {
	const seedEmail = getEnv().SEED_ADMIN_EMAIL?.toLowerCase()
	return Boolean(seedEmail && email.toLowerCase() === seedEmail)
}

export async function bootstrapFirstAdmin(input: {
	email: string
	password: string
	name?: string
}): Promise<UserDocument | null> {
	if (!isSeedAdminEmail(input.email)) {
		return null
	}

	const labs = await findOrganizationBySlug(VENDFORGE_LABS_SLUG)
	if (!labs) {
		return null
	}

	const adminRole = await findSystemAdminRole()
	if (!adminRole) {
		return null
	}

	await createUser({
		name: input.name?.trim() || input.email.split("@")[0] || "Admin",
		email: input.email,
		password: input.password,
		role: adminRole.slug,
		orgId: labs._id.toHexString(),
		orgSlug: labs.slug,
		organization: null,
		scopePath: GLOBAL_SCOPE,
		tags: [],
		accessStatus: "invited",
		resourceAccess: ALL_RESOURCE_ACCESS,
		emailVerified: true,
		passwordReady: true,
		inviteAcceptedAt: new Date(),
	})

	return findUserByEmail(input.email)
}
