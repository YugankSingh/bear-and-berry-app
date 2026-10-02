import { listOrganizationTags } from "@/lib/repositories/organizations"
import { requireOrgCatalogAccess } from "@/lib/auth/require-org-catalog"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		await requireOrgCatalogAccess()
		const tags = await listOrganizationTags()
		return ok({ tags })
	} catch (error) {
		return handleApiError(error)
	}
}
