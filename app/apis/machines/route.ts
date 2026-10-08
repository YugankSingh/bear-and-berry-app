import { machineCreateSchema } from "@/lib/validations/machine"
import { createMachine, listMachines } from "@/lib/repositories/machines"
import { findLocationById } from "@/lib/repositories/locations"
import { findOrganizationBySlug } from "@/lib/repositories/organizations"
import { requirePermission } from "@/lib/auth/require-auth"
import { canSeeLocation, filterMachines } from "@/lib/auth/fleet-access"
import { hasUnrestrictedAccess } from "@/lib/auth/permissions"
import { canUseOrganization } from "@/lib/auth/workspace"
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

		const location = body.locationId ? await findLocationById(body.locationId) : null
		if (body.locationId && !location) {
			return fail("NOT_FOUND", "Location not found.", 404)
		}
		if (location && !canSeeLocation(user, location)) {
			return fail("FORBIDDEN", "You do not have access to that location.", 403)
		}

		const orgSlug = body.orgSlug || user.activeOrgSlug || location?.orgSlug
		if (!orgSlug) {
			return fail("VALIDATION_ERROR", "Pick an organization for this machine.", 400)
		}
		if (location && location.orgSlug !== orgSlug) {
			return fail("VALIDATION_ERROR", "That location belongs to a different organization.", 400)
		}
		if (!hasUnrestrictedAccess(user) && !canUseOrganization(user, orgSlug)) {
			return fail("FORBIDDEN", "You do not have access to that organization.", 403)
		}
		const org = await findOrganizationBySlug(orgSlug)
		if (!org) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}

		const machine = await createMachine(body, org._id.toHexString(), org.slug)
		return ok({ machine }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
