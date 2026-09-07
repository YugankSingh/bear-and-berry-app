import { hasAnyPermission } from "@/lib/auth/rbac"
import { AuthError, requireDashboardSession } from "@/lib/auth/require-auth"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requireDashboardSession()
		if (!hasAnyPermission(user, ["users:read", "locations:read", "machines:read"])) {
			throw new AuthError("You do not have access to this resource.", 403)
		}
		const { organizations } = await loadVisibleFleet(user)
		return ok({ organizations })
	} catch (error) {
		return handleApiError(error)
	}
}
