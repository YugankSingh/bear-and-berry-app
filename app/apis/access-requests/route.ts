import { listAccessRequests } from "@/lib/repositories/users"
import { requirePermission } from "@/lib/auth/require-auth"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		await requirePermission("signups:read")
		const requests = await listAccessRequests()
		return ok({ requests })
	} catch (error) {
		return handleApiError(error)
	}
}
