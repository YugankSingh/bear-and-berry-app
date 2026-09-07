import { acceptInviteSchema } from "@/lib/validations/auth"
import { isUserLive, resolveAccessStatus, resolveInviteState } from "@/lib/auth/access"
import { hashSecret } from "@/lib/auth/tokens"
import { setSessionCookie, toSessionUser } from "@/lib/auth/session"
import { findUserByInviteTokenHash, updateUser } from "@/lib/repositories/users"
import { ensureDatabaseReady } from "@/lib/seed"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function POST(request: Request) {
	try {
		await ensureDatabaseReady()
		const body = acceptInviteSchema.parse(await readJson(request))
		const user = await findUserByInviteTokenHash(hashSecret(body.token))
		if (!isUserLive(user)) {
			return fail("NOT_FOUND", "This invitation is not valid.", 404)
		}

		const inviteState = resolveInviteState(user)
		if (inviteState === "expired") {
			return fail("UNAUTHORIZED", "This invitation has expired. Ask an admin to send a new one.", 401)
		}
		if (inviteState !== "pending") {
			return fail("CONFLICT", "This invitation has already been used.", 409)
		}

		const needsPassword = user.passwordReady === false
		if (needsPassword && !body.password) {
			return fail("VALIDATION_ERROR", "Choose a password to finish setting up your account.", 400)
		}

		const updated = await updateUser(user._id.toHexString(), {
			accessStatus: "invited",
			emailVerified: true,
			inviteAcceptedAt: new Date(),
			inviteTokenHash: null,
			inviteExpiresAt: null,
			password: body.password,
			passwordReady: true,
		})
		if (!updated) {
			return fail("SERVER_ERROR", "Could not accept this invitation.", 500)
		}

		const accepted = {
			...user,
			accessStatus: "invited" as const,
			emailVerified: true,
			passwordReady: true,
			inviteAcceptedAt: new Date(),
			inviteTokenHash: null,
			inviteExpiresAt: null,
		}
		await setSessionCookie(await toSessionUser(accepted))
		return ok({
			user: updated,
			accessStatus: resolveAccessStatus("invited"),
		})
	} catch (error) {
		return handleApiError(error)
	}
}
