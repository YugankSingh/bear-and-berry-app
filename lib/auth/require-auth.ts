import { getSessionUser } from "@/lib/auth/session"
import { assertPermission, hasPermission } from "@/lib/auth/rbac"
import type { Permission, SessionUser } from "@/types/domain"

export class AuthError extends Error {
	readonly status: 401 | 403

	constructor(message: string, status: 401 | 403) {
		super(message)
		this.name = "AuthError"
		this.status = status
	}
}

export async function requireSession(): Promise<SessionUser> {
	const user = await getSessionUser()
	if (!user) {
		throw new AuthError("Sign in to continue.", 401)
	}
	return user
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
	const user = await requireSession()
	if (!hasPermission(user.role, permission)) {
		assertPermission(user.role, permission)
	}
	return user
}
