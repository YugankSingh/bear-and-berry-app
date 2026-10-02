import { organizationTagSchema, organizationTagsReplaceSchema } from "@/lib/validations/organization"
import { addOrganizationTag, setOrganizationTags } from "@/lib/repositories/organizations"
import { requireOrgCatalogAccess } from "@/lib/auth/require-org-catalog"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ slug: string }>
}

export async function PUT(request: Request, context: RouteContext) {
	try {
		await requireOrgCatalogAccess()
		const { slug } = await context.params
		const body = organizationTagsReplaceSchema.parse(await readJson(request))
		const organization = await setOrganizationTags(slug, body.tags)
		if (!organization) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}
		return ok({ organization })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request, context: RouteContext) {
	try {
		await requireOrgCatalogAccess()
		const { slug } = await context.params
		const body = organizationTagSchema.parse(await readJson(request))
		const organization = await addOrganizationTag(slug, body.tag)
		if (!organization) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}
		return ok({ organization }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
