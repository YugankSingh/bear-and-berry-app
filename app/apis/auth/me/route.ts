import { requireSession } from "@/lib/auth/require-auth"
import { permissionsForUser } from "@/lib/auth/rbac"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requireSession()
		return ok({
			user,
			permissions: permissionsForUser(user),
			grants: user.grantKeys,
			memberships: user.memberships,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
