import { findOrganizationBySlug, removeOrganizationTag } from "@/lib/repositories/organizations"
import { requireDashboardSession } from "@/lib/auth/require-auth"
import { authorizeRemoveTag } from "@/lib/auth/org-tagging"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ slug: string; tag: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
	try {
		const actor = await requireDashboardSession()
		const { slug, tag } = await context.params
		const existing = await findOrganizationBySlug(slug)
		if (!existing) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}

		const decision = authorizeRemoveTag(actor, { slug: existing.slug, tags: existing.tags })
		if (!decision.ok) {
			return fail("FORBIDDEN", decision.error, decision.status)
		}

		const organization = await removeOrganizationTag(slug, decodeURIComponent(tag))
		if (!organization) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}
		return ok({ organization })
	} catch (error) {
		return handleApiError(error)
	}
}
