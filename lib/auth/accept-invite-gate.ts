import { isUserLive, resolveInviteState } from "@/lib/auth/access"

export type AcceptInviteGateUser = {
	isActive?: boolean
	deletedAt?: Date | string | null
	passwordReady?: boolean
	accessStatus?: string
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | string | null
	inviteAcceptedAt?: Date | string | null
}

export type AcceptInviteGateResult =
	| { ok: true }
	| { ok: false; status: 400 | 401 | 404 | 409; error: string }

export function authorizeAcceptInvite(
	user: AcceptInviteGateUser | null | undefined,
	hasPasswordInBody: boolean,
): AcceptInviteGateResult {
	if (!isUserLive(user)) {
		return { ok: false, status: 404, error: "This invitation is not valid." }
	}

	const inviteState = resolveInviteState(user)
	if (inviteState === "expired") {
		return {
			ok: false,
			status: 401,
			error: "This invitation has expired. Ask an admin to send a new one.",
		}
	}
	if (inviteState !== "pending") {
		return { ok: false, status: 409, error: "This invitation has already been used." }
	}

	if (user.passwordReady === false && !hasPasswordInBody) {
		return {
			ok: false,
			status: 400,
			error: "Choose a password to finish setting up your account.",
		}
	}

	return { ok: true }
}
