import { isUserRemoved, resolveAccessStatus, resolveInviteState } from "@/lib/auth/access"
import type { UserDocument } from "@/lib/db/documents"

export type AuthNext = "login" | "signup" | "verify" | "invite_pending" | "invite_expired" | "removed"

export function nextAuthStep(user: UserDocument | null): AuthNext {
	if (!user) {
		return "signup"
	}

	if (isUserRemoved(user)) {
		return "removed"
	}

	const inviteState = resolveInviteState(user)
	if (inviteState === "pending") {
		return "invite_pending"
	}
	if (inviteState === "expired") {
		return "invite_expired"
	}

	if (resolveAccessStatus(user.accessStatus) === "waitlisted" && !user.emailVerified) {
		return "verify"
	}

	return "login"
}
