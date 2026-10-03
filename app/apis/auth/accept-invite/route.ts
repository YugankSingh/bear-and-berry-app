import { acceptInviteSchema } from "@/lib/validations/auth"
import { resolveAccessStatus } from "@/lib/auth/access"
import { authorizeAcceptInvite } from "@/lib/auth/accept-invite-gate"
import { hashSecret } from "@/lib/auth/tokens"
import { hydrateAuthUser, setSessionCookie } from "@/lib/auth/session"
import { findUserByInviteTokenHash, updateUser } from "@/lib/repositories/users"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function POST(request: Request) {
	try {
		const body = acceptInviteSchema.parse(await readJson(request))
		const user = await findUserByInviteTokenHash(hashSecret(body.token))
		const gate = authorizeAcceptInvite(user, Boolean(body.password))
		if (!gate.ok) {
			const code =
				gate.status === 404
					? "NOT_FOUND"
					: gate.status === 401
						? "UNAUTHORIZED"
						: gate.status === 409
							? "CONFLICT"
							: "VALIDATION_ERROR"
			return fail(code, gate.error, gate.status)
		}

		const updated = await updateUser(user!._id.toHexString(), {
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
			...user!,
			accessStatus: "invited" as const,
			emailVerified: true,
			passwordReady: true,
			inviteAcceptedAt: new Date(),
			inviteTokenHash: null,
			inviteExpiresAt: null,
		}
		const { session } = await hydrateAuthUser(accepted)
		await setSessionCookie(session)
		return ok({
			user: updated,
			accessStatus: resolveAccessStatus("invited"),
		})
	} catch (error) {
		return handleApiError(error)
	}
}
