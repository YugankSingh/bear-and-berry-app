import { inventoryPatchSchema } from "@/lib/validations/inventory"
import { updateInventoryQuantity } from "@/lib/repositories/inventory"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		await requirePermission("inventory:write")
		const { id } = await context.params
		const body = inventoryPatchSchema.parse(await readJson(request))
		const slot = await updateInventoryQuantity(id, body.quantity)
		if (!slot) {
			return fail("NOT_FOUND", "Inventory slot not found.", 404)
		}
		return ok({ slot })
	} catch (error) {
		return handleApiError(error)
	}
}
