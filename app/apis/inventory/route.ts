import { requirePermission } from "@/lib/auth/require-auth"
import { loadVisibleInventory } from "@/lib/auth/visible-fleet"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requirePermission("inventory:read")
		const slots = await loadVisibleInventory(user)
		return ok({ slots })
	} catch (error) {
		return handleApiError(error)
	}
}
