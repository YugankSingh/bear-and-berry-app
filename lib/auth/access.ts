import { ACCESS_STATUSES, type AccessStatus, type InviteState } from "@/types/domain"

export function resolveAccessStatus(value: unknown): AccessStatus {
	if (value === "waitlisted" || value === "pending_invite") {
		return value
	}
	return "invited"
}

export function hasDashboardAccess(value: unknown): boolean {
	return resolveAccessStatus(value) === "invited"
}

export function isAccessStatus(value: unknown): value is AccessStatus {
	return typeof value === "string" && ACCESS_STATUSES.includes(value as AccessStatus)
}

export function resolveInviteState(user: {
	accessStatus?: AccessStatus | string
	inviteTokenHash?: string | null
	inviteExpiresAt?: Date | string | null
	inviteAcceptedAt?: Date | string | null
}): InviteState {
	if (user.inviteAcceptedAt) {
		return "accepted"
	}
	if (user.inviteTokenHash) {
		const expiresAt = user.inviteExpiresAt ? new Date(user.inviteExpiresAt) : null
		if (expiresAt && expiresAt.getTime() < Date.now()) {
			return "expired"
		}
		return "pending"
	}
	return resolveAccessStatus(user.accessStatus) === "pending_invite" ? "pending" : "none"
}

export function isInviteExpired(user: {
	inviteExpiresAt?: Date | string | null
	inviteAcceptedAt?: Date | string | null
	inviteTokenHash?: string | null
}): boolean {
	return resolveInviteState(user) === "expired"
}

export function isUserRemoved(user: { deletedAt?: Date | string | null } | null | undefined): boolean {
	return Boolean(user?.deletedAt)
}

export function isUserLive<T extends { isActive?: boolean; deletedAt?: Date | string | null }>(
	user: T | null | undefined,
): user is T {
	if (!user) {
		return false
	}
	return user.isActive !== false && !isUserRemoved(user)
}
