import { machinePatchSchema } from "@/lib/validations/machine"
import { findMachineById, updateMachine } from "@/lib/repositories/machines"
import { findLocationById } from "@/lib/repositories/locations"
import { requirePermission } from "@/lib/auth/require-auth"
import { canSeeLocation, canSeeMachine } from "@/lib/auth/resource-access"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const user = await requirePermission("machines:write")
		const { id } = await context.params
		const existing = await findMachineById(id)
		if (!existing) {
			return fail("NOT_FOUND", "Machine not found.", 404)
		}
		if (!canSeeMachine(user, existing)) {
			return fail("FORBIDDEN", "You do not have access to that machine.", 403)
		}

		const body = machinePatchSchema.parse(await readJson(request))
		if (body.locationId) {
			const location = await findLocationById(body.locationId)
			if (!location) {
				return fail("NOT_FOUND", "Location not found.", 404)
			}
			if (!canSeeLocation(user, location)) {
				return fail("FORBIDDEN", "You do not have access to that location.", 403)
			}
		}

		const machine = await updateMachine(id, body)
		if (!machine) {
			return fail("NOT_FOUND", "Machine not found.", 404)
		}
		return ok({ machine })
	} catch (error) {
		return handleApiError(error)
	}
}
