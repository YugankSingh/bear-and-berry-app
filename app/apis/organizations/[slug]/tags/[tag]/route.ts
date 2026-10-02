import { removeOrganizationTag } from "@/lib/repositories/organizations"
import { requireOrgCatalogAccess } from "@/lib/auth/require-org-catalog"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ slug: string; tag: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
	try {
		await requireOrgCatalogAccess()
		const { slug, tag } = await context.params
		const decoded = decodeURIComponent(tag)
		const organization = await removeOrganizationTag(slug, decoded)
		if (!organization) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}
		return ok({ organization })
	} catch (error) {
		return handleApiError(error)
	}
}
