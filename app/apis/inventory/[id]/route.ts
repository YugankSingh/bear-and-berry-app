import { inventoryPatchSchema } from "@/lib/validations/inventory"
import { findInventoryById, updateInventoryQuantity } from "@/lib/repositories/inventory"
import { findMachineById } from "@/lib/repositories/machines"
import { requirePermission } from "@/lib/auth/require-auth"
import { canSeeMachine } from "@/lib/auth/resource-access"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const user = await requirePermission("inventory:write")
		const { id } = await context.params
		const existing = await findInventoryById(id)
		if (!existing) {
			return fail("NOT_FOUND", "Inventory slot not found.", 404)
		}
		const machine = await findMachineById(existing.machineId)
		if (!machine || !canSeeMachine(user, machine)) {
			return fail("FORBIDDEN", "You do not have access to that machine.", 403)
		}
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
