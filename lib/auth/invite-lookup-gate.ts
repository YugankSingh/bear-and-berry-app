import { isUserLive, resolveInviteState } from "@/lib/auth/access"

export type InviteLookupGateUser = {
	isActive?: boolean
	deletedAt?: Date | string | null
	accessStatus?: string
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | string | null
	inviteAcceptedAt?: Date | string | null
}

export type InviteLookupGateResult =
	| { ok: true }
	| { ok: false; status: 401 | 404 | 409; error: string }

export function authorizeInviteLookup(
	user: InviteLookupGateUser | null | undefined,
): InviteLookupGateResult {
	if (!isUserLive(user)) {
		return { ok: false, status: 404, error: "This invitation is not valid." }
	}

	const inviteState = resolveInviteState(user)
	if (inviteState === "expired") {
		return { ok: false, status: 401, error: "This invitation has expired." }
	}
	if (inviteState !== "pending") {
		return { ok: false, status: 409, error: "This invitation has already been used." }
	}

	return { ok: true }
}
