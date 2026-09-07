import { machineCreateSchema } from "@/lib/validations/machine"
import { createMachine, listMachines } from "@/lib/repositories/machines"
import { findLocationById } from "@/lib/repositories/locations"
import { requirePermission } from "@/lib/auth/require-auth"
import { canSeeLocation, filterMachines } from "@/lib/auth/resource-access"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requirePermission("machines:read")
		const machines = filterMachines(user, await listMachines())
		return ok({ machines })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const user = await requirePermission("machines:write")
		const body = machineCreateSchema.parse(await readJson(request))
		if (body.locationId) {
			const location = await findLocationById(body.locationId)
			if (!location) {
				return fail("NOT_FOUND", "Location not found.", 404)
			}
			if (!canSeeLocation(user, location)) {
				return fail("FORBIDDEN", "You do not have access to that location.", 403)
			}
		}
		const machine = await createMachine(
			body,
			user.orgId,
			user.orgSlug === "vendforge-labs" ? "bear-and-berry" : user.orgSlug,
		)
		return ok({ machine }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
