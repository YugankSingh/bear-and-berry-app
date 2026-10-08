import { AuthError, requireDashboardSession } from "@/lib/auth/require-auth"
import { PERMISSION_CATALOG, hasAnyPermission } from "@/lib/auth/permissions"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requireDashboardSession()
		if (!hasAnyPermission(user, ["users:grant", "users:write", "roles:read", "roles:write"])) {
			throw new AuthError("You do not have access to this resource.", 403)
		}
		return ok({ permissions: PERMISSION_CATALOG })
	} catch (error) {
		return handleApiError(error)
	}
}
