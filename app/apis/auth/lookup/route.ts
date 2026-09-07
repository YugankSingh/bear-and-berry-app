import { emailLookupSchema } from "@/lib/validations/auth"
import { findUserByEmail } from "@/lib/repositories/users"
import { nextAuthStep } from "@/lib/auth/lookup"
import { isSeedAdminEmail } from "@/lib/auth/bootstrap"
import { countUsers } from "@/lib/repositories/users"
import { ensureDatabaseReady } from "@/lib/seed"
import { ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function POST(request: Request) {
	try {
		await ensureDatabaseReady()
		const body = emailLookupSchema.parse(await readJson(request))
		const email = body.email.trim().toLowerCase()
		const user = await findUserByEmail(email)

		let next = nextAuthStep(user)
		if (!user && (await countUsers()) === 0 && isSeedAdminEmail(email)) {
			next = "signup"
		}

		return ok({ email, exists: Boolean(user), next })
	} catch (error) {
		return handleApiError(error)
	}
}
