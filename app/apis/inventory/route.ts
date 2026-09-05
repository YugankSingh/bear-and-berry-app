import { listInventory } from "@/lib/repositories/inventory"
import { requirePermission } from "@/lib/auth/require-auth"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		await requirePermission("inventory:read")
		const slots = await listInventory()
		return ok({ slots })
	} catch (error) {
		return handleApiError(error)
	}
}
