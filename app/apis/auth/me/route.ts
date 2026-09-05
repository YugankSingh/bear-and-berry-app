import { requireSession } from "@/lib/auth/require-auth"
import { permissionsForRole } from "@/lib/auth/rbac"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requireSession()
		return ok({
			user,
			permissions: permissionsForRole(user.role),
		})
	} catch (error) {
		return handleApiError(error)
	}
}
