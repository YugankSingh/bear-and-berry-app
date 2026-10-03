import { verifyOtpSchema } from "@/lib/validations/auth"
import { isUserLive, resolveAccessStatus } from "@/lib/auth/access"
import { verifyHashedSecret } from "@/lib/auth/tokens"
import { authorizeVerifyOtp } from "@/lib/auth/verify-otp-gate"
import { hydrateAuthUser, setSessionCookie } from "@/lib/auth/session"
import { findUserByEmail, updateUser } from "@/lib/repositories/users"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function POST(request: Request) {
	try {
		const body = verifyOtpSchema.parse(await readJson(request))
		const user = await findUserByEmail(body.email)
		if (!isUserLive(user)) {
			return fail("NOT_FOUND", "We could not find that account.", 404)
		}
		const gate = authorizeVerifyOtp(user, body.otp, verifyHashedSecret)
		if (!gate.ok) {
			return fail(gate.status === 409 ? "CONFLICT" : "UNAUTHORIZED", gate.error, gate.status)
		}

		const updated = await updateUser(user._id.toHexString(), {
			emailVerified: true,
			emailOtpHash: null,
			emailOtpExpiresAt: null,
		})
		if (!updated) {
			return fail("SERVER_ERROR", "Could not verify your email.", 500)
		}

		const verified = {
			...user,
			emailVerified: true,
			emailOtpHash: null,
			emailOtpExpiresAt: null,
		}
		const { session } = await hydrateAuthUser(verified)
		await setSessionCookie(session)
		return ok({
			user: updated,
			accessStatus: resolveAccessStatus(verified.accessStatus),
		})
	} catch (error) {
		return handleApiError(error)
	}
}
