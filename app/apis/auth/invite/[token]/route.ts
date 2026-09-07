import { hashSecret } from "@/lib/auth/tokens"
import { isUserLive, resolveInviteState } from "@/lib/auth/access"
import { findUserByInviteTokenHash } from "@/lib/repositories/users"
import { ensureDatabaseReady } from "@/lib/seed"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ token: string }>
}

export async function GET(_request: Request, context: RouteContext) {
	try {
		await ensureDatabaseReady()
		const { token } = await context.params
		const user = await findUserByInviteTokenHash(hashSecret(token))
		if (!isUserLive(user)) {
			return fail("NOT_FOUND", "This invitation is not valid.", 404)
		}

		const inviteState = resolveInviteState(user)
		if (inviteState === "expired") {
			return fail("UNAUTHORIZED", "This invitation has expired.", 401)
		}
		if (inviteState !== "pending") {
			return fail("CONFLICT", "This invitation has already been used.", 409)
		}

		return ok({
			email: user.email,
			name: user.name,
			needsPassword: user.passwordReady === false,
			expiresAt: user.inviteExpiresAt?.toISOString() ?? null,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
