import { machinePatchSchema } from "@/lib/validations/machine"
import { updateMachine } from "@/lib/repositories/machines"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		await requirePermission("machines:write")
		const { id } = await context.params
		const body = machinePatchSchema.parse(await readJson(request))
		const machine = await updateMachine(id, body)
		if (!machine) {
			return fail("NOT_FOUND", "Machine not found.", 404)
		}
		return ok({ machine })
	} catch (error) {
		return handleApiError(error)
	}
}
