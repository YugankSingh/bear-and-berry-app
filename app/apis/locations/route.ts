import { locationCreateSchema } from "@/lib/validations/location"
import { createLocation, listLocations } from "@/lib/repositories/locations"
import { findOrganizationBySlug } from "@/lib/repositories/organizations"
import { requirePermission } from "@/lib/auth/require-auth"
import { filterLocations } from "@/lib/auth/fleet-access"
import { hasUnrestrictedAccess } from "@/lib/auth/team-access"
import { canUseOrganization } from "@/lib/auth/workspace"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requirePermission("locations:read")
		const locations = filterLocations(user, await listLocations())
		return ok({ locations })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const user = await requirePermission("locations:write")
		const body = locationCreateSchema.parse(await readJson(request))
		const orgSlug = body.orgSlug || user.activeOrgSlug
		if (!orgSlug) {
			return fail("VALIDATION_ERROR", "Pick an organization for this location.", 400)
		}
		if (!hasUnrestrictedAccess(user) && !canUseOrganization(user, orgSlug)) {
			return fail("FORBIDDEN", "You do not have access to that organization.", 403)
		}
		const org = await findOrganizationBySlug(orgSlug)
		if (!org) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}
		const location = await createLocation(body, { id: org._id.toHexString(), slug: org.slug })
		return ok({ location }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
