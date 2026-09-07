import { clearSessionCookie, getSessionUser, hasSessionCookie } from "@/lib/auth/session"
import { hasDashboardAccess } from "@/lib/auth/access"
import { assertPermission, hasPermission } from "@/lib/auth/rbac"
import { isSystemAdmin } from "@/lib/auth/permissions"
import { canSeeResource, isVendforgeLabs } from "@/lib/auth/scope"
import { hasGrant, type GrantQuery } from "@/lib/auth/grants"
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
		if (await hasSessionCookie()) {
			await clearSessionCookie()
		}
		throw new AuthError("Sign in to continue.", 401)
	}
	return user
}

export async function requireDashboardSession(): Promise<SessionUser> {
	const user = await requireSession()
	if (!hasDashboardAccess(user.accessStatus)) {
		throw new AuthError("Your account is on the waitlist.", 403)
	}
	return user
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
	const user = await requireDashboardSession()
	if (!hasPermission(user, permission)) {
		assertPermission(user, permission)
	}
	return user
}

export async function requireScoped(
	permission: Permission,
	resourcePath: string,
): Promise<SessionUser> {
	const user = await requirePermission(permission)
	if (!canSeeResource(user, resourcePath)) {
		throw new AuthError("You do not have access to this resource.", 403)
	}
	return user
}

export async function requireGrant(query: GrantQuery): Promise<SessionUser> {
	const user = await requireDashboardSession()
	if (isSystemAdmin(user) || hasGrant(user.grants, query)) {
		return user
	}
	throw new AuthError("You do not have access to this resource.", 403)
}

export async function requireVendforgeCms(permission: "cms:read" | "cms:write"): Promise<SessionUser> {
	const user = await requirePermission(permission)
	if (!isSystemAdmin(user) && !isVendforgeLabs(user)) {
		throw new AuthError("Blog CMS is limited to VendForge Labs.", 403)
	}
	return user
}