import { loginSchema } from "@/lib/validations/auth"
import { countUsers, findUserByEmail } from "@/lib/repositories/users"
import { verifyPassword } from "@/lib/auth/password"
import { establishSession } from "@/lib/auth/session"
import { bootstrapFirstAdmin } from "@/lib/auth/bootstrap"
import { authorizeLogin } from "@/lib/auth/login-gate"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function POST(request: Request) {
	try {
		const body = loginSchema.parse(await readJson(request))
		let user = await findUserByEmail(body.email)

		if (!user && (await countUsers()) === 0) {
			user = await bootstrapFirstAdmin({
				email: body.email,
				password: body.password,
			})
		}

		const gate = authorizeLogin(user)
		if (!gate.ok) {
			return fail(gate.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", gate.error, gate.status)
		}

		const valid = await verifyPassword(body.password, user!.passwordHash)
		if (!valid) {
			return fail("UNAUTHORIZED", "Those credentials do not match our records.", 401)
		}

		const { record } = await establishSession(user!)
		return ok({
			user: record,
			accessStatus: record.accessStatus,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
