import { locationPatchSchema } from "@/lib/validations/location"
import { updateLocation } from "@/lib/repositories/locations"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		await requirePermission("locations:write")
		const { id } = await context.params
		const body = locationPatchSchema.parse(await readJson(request))
		const location = await updateLocation(id, body)
		if (!location) {
			return fail("NOT_FOUND", "Location not found.", 404)
		}
		return ok({ location })
	} catch (error) {
		return handleApiError(error)
	}
}
