import { loginSchema } from "@/lib/validations/auth"
import { countUsers, findUserByEmail, toUserRecord } from "@/lib/repositories/users"
import { verifyPassword } from "@/lib/auth/password"
import { setSessionCookie, toSessionUser } from "@/lib/auth/session"
import { bootstrapFirstAdmin } from "@/lib/auth/bootstrap"
import { isUserLive, resolveAccessStatus, resolveInviteState } from "@/lib/auth/access"
import { ensureDatabaseReady } from "@/lib/seed"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function POST(request: Request) {
	try {
		await ensureDatabaseReady()
		const body = loginSchema.parse(await readJson(request))
		let user = await findUserByEmail(body.email)

		if (!user && (await countUsers()) === 0) {
			user = await bootstrapFirstAdmin({
				email: body.email,
				password: body.password,
			})
		}

		if (!isUserLive(user)) {
			return fail("UNAUTHORIZED", "Those credentials do not match our records.", 401)
		}

		const inviteState = resolveInviteState(user)
		if (inviteState === "pending") {
			return fail("FORBIDDEN", "Check your email for the invitation link before signing in.", 403)
		}
		if (inviteState === "expired") {
			return fail("FORBIDDEN", "Your invitation expired. Ask an admin to send a new one.", 403)
		}
		if (user.passwordReady === false) {
			return fail("FORBIDDEN", "This account is waiting for you to set a password from the invite email.", 403)
		}
		if (resolveAccessStatus(user.accessStatus) === "waitlisted" && !user.emailVerified) {
			return fail("FORBIDDEN", "Verify your email with the code we sent before signing in.", 403)
		}

		const valid = await verifyPassword(body.password, user.passwordHash)
		if (!valid) {
			return fail("UNAUTHORIZED", "Those credentials do not match our records.", 401)
		}

		const session = await toSessionUser(user)
		await setSessionCookie(session)
		return ok({
			user: await toUserRecord(user),
			accessStatus: resolveAccessStatus(user.accessStatus),
		})
	} catch (error) {
		return handleApiError(error)
	}
}
