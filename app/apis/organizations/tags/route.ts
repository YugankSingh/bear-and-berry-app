import { tagCatalogCreateSchema } from "@/lib/validations/organization"
import { createTag, listTagCatalogWithUsage } from "@/lib/repositories/organization-tags"
import { AuthError, requireDashboardSession } from "@/lib/auth/require-auth"
import { canTagAnyOrganization } from "@/lib/auth/org-tagging"
import { hasPermission } from "@/lib/auth/permissions"
import { ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		const actor = await requireDashboardSession()
		if (!hasPermission(actor, "orgs:all") && !canTagAnyOrganization(actor)) {
			throw new AuthError("You do not have access to organization tags.", 403)
		}
		const tags = await listTagCatalogWithUsage()
		return ok({ tags })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const actor = await requireDashboardSession()
		if (!canTagAnyOrganization(actor)) {
			throw new AuthError("You do not have permission to create organization tags.", 403)
		}
		const body = tagCatalogCreateSchema.parse(await readJson(request))
		const created = await createTag(body.tag, actor.id)
		return ok({ tag: body.tag, created }, created ? 201 : 200)
	} catch (error) {
		return handleApiError(error)
	}
}
