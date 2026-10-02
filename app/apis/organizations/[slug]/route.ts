import { organizationPatchSchema } from "@/lib/validations/organization"
import { findOrganizationBySlug, updateOrganization } from "@/lib/repositories/organizations"
import { requireOrgCatalogAccess } from "@/lib/auth/require-org-catalog"
import { mapOrganization } from "@/lib/db/mappers"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ slug: string }>
}

export async function GET(_request: Request, context: RouteContext) {
	try {
		await requireOrgCatalogAccess()
		const { slug } = await context.params
		const existing = await findOrganizationBySlug(slug)
		if (!existing) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}
		return ok({ organization: mapOrganization(existing) })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		await requireOrgCatalogAccess()
		const { slug } = await context.params
		const body = organizationPatchSchema.parse(await readJson(request))
		const organization = await updateOrganization(slug, body)
		if (!organization) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}
		return ok({ organization })
	} catch (error) {
		return handleApiError(error)
	}
}
