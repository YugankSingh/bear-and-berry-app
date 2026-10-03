import { hashSecret } from "@/lib/auth/tokens"
import { authorizeInviteLookup } from "@/lib/auth/invite-lookup-gate"
import { findUserByInviteTokenHash } from "@/lib/repositories/users"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ token: string }>
}

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { token } = await context.params
		const user = await findUserByInviteTokenHash(hashSecret(token))
		const gate = authorizeInviteLookup(user)
		if (!gate.ok) {
			const code =
				gate.status === 404 ? "NOT_FOUND" : gate.status === 401 ? "UNAUTHORIZED" : "CONFLICT"
			return fail(code, gate.error, gate.status)
		}

		return ok({
			email: user!.email,
			name: user!.name,
			needsPassword: user!.passwordReady === false,
			expiresAt: user!.inviteExpiresAt?.toISOString() ?? null,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
