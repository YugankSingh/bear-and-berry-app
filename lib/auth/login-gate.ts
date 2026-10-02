import { isUserLive, resolveAccessStatus, resolveInviteState } from "@/lib/auth/access"

export type LoginGateUser = {
	isActive?: boolean
	deletedAt?: Date | string | null
	passwordReady?: boolean
	emailVerified?: boolean
	accessStatus?: string
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | string | null
	inviteAcceptedAt?: Date | string | null
}

export type LoginGateResult =
	| { ok: true }
	| { ok: false; status: 401 | 403; error: string }

export function authorizeLogin(user: LoginGateUser | null | undefined): LoginGateResult {
	if (!isUserLive(user)) {
		return { ok: false, status: 401, error: "Those credentials do not match our records." }
	}

	const inviteState = resolveInviteState(user)
	if (inviteState === "pending") {
		return { ok: false, status: 403, error: "Check your email for the invitation link before signing in." }
	}
	if (inviteState === "expired") {
		return { ok: false, status: 403, error: "Your invitation expired. Ask an admin to send a new one." }
	}
	if (user.passwordReady === false) {
		return {
			ok: false,
			status: 403,
			error: "This account is waiting for you to set a password from the invite email.",
		}
	}
	if (resolveAccessStatus(user.accessStatus) === "waitlisted" && !user.emailVerified) {
		return { ok: false, status: 403, error: "Verify your email with the code we sent before signing in." }
	}

	return { ok: true }
}
