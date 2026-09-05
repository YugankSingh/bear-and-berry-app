import { loginSchema } from "@/lib/validations/auth"
import { countUsers, createUser, findUserByEmail } from "@/lib/repositories/users"
import { findOrganizationBySlug } from "@/lib/repositories/organizations"
import { verifyPassword } from "@/lib/auth/password"
import { setSessionCookie } from "@/lib/auth/session"
import { GLOBAL_SCOPE, VENDFORGE_LABS_SLUG } from "@/lib/auth/scope"
import { ensureDatabaseReady } from "@/lib/seed"
import { getEnv } from "@/lib/env"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"
import { mapUser } from "@/lib/db/mappers"
import type { UserDocument } from "@/lib/db/documents"

function toSession(user: UserDocument) {
	return {
		id: user._id.toHexString(),
		name: user.name,
		email: user.email,
		role: user.role,
		orgId: user.orgId.toHexString(),
		orgSlug: user.orgSlug,
		scopePath: user.scopePath,
		tags: user.tags,
	}
}

export async function POST(request: Request) {
	try {
		await ensureDatabaseReady()
		const body = loginSchema.parse(await readJson(request))
		let user = await findUserByEmail(body.email)
		const env = getEnv()

		if (!user && (await countUsers()) === 0) {
			const seedEmail = env.SEED_ADMIN_EMAIL?.toLowerCase()
			if (seedEmail && body.email.toLowerCase() === seedEmail) {
				const labs = await findOrganizationBySlug(VENDFORGE_LABS_SLUG)
				if (!labs) {
					return fail("SERVER_ERROR", "VendForge Labs organization is missing.", 500)
				}
				await createUser({
					name: env.SEED_ADMIN_NAME,
					email: body.email,
					password: body.password,
					role: "super_admin",
					orgId: labs._id.toHexString(),
					orgSlug: labs.slug,
					organization: labs.name,
					scopePath: GLOBAL_SCOPE,
					tags: ["vendforge-labs"],
				})
				user = await findUserByEmail(body.email)
			}
		}

		if (!user || !user.isActive) {
			return fail("UNAUTHORIZED", "Those credentials do not match our records.", 401)
		}

		const valid = await verifyPassword(body.password, user.passwordHash)
		if (!valid) {
			return fail("UNAUTHORIZED", "Those credentials do not match our records.", 401)
		}

		await setSessionCookie(toSession(user))
		return ok({ user: mapUser(user) })
	} catch (error) {
		return handleApiError(error)
	}
}