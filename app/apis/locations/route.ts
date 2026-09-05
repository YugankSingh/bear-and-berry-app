import { locationCreateSchema } from "@/lib/validations/location"
import { createLocation, listLocations } from "@/lib/repositories/locations"
import { requirePermission } from "@/lib/auth/require-auth"
import { scopedFilter } from "@/lib/auth/scope"
import { ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requirePermission("locations:read")
		const locations = scopedFilter(user, await listLocations())
		return ok({ locations })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const user = await requirePermission("locations:write")
		const body = locationCreateSchema.parse(await readJson(request))
		const location = await createLocation(body, user.orgId)
		return ok({ location }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}