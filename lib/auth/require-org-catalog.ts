import { AuthError, requireDashboardSession } from "@/lib/auth/require-auth"
import { hasPermission, isSystemAdmin } from "@/lib/auth/permissions"
import type { SessionUser } from "@/types/domain"

export async function requireOrgCatalogAccess(): Promise<SessionUser> {
	const user = await requireDashboardSession()
	if (!isSystemAdmin(user) && !hasPermission(user, "orgs:all")) {
		throw new AuthError("You do not have access to manage organizations.", 403)
	}
	return user
}
