import { loginSchema } from "@/lib/validations/auth"
import { findUserByEmail } from "@/lib/repositories/users"
import { verifyPassword } from "@/lib/auth/password"
import { setSessionCookie } from "@/lib/auth/session"
import { ensureBootstrap } from "@/lib/seed"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"
import { mapUser } from "@/lib/db/mappers"

export async function POST(request: Request) {
	try {
		await ensureBootstrap()
		const body = loginSchema.parse(await readJson(request))
		const user = await findUserByEmail(body.email)

		if (!user || !user.isActive) {
			return fail("UNAUTHORIZED", "Those credentials do not match our records.", 401)
		}

		const valid = await verifyPassword(body.password, user.passwordHash)
		if (!valid) {
			return fail("UNAUTHORIZED", "Those credentials do not match our records.", 401)
		}

		await setSessionCookie({
			id: user._id.toHexString(),
			name: user.name,
			email: user.email,
			role: user.role,
		})

		return ok({ user: mapUser(user) })
	} catch (error) {
		return handleApiError(error)
	}
}
