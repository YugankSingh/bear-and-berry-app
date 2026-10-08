import { organizationTagSchema } from "@/lib/validations/organization"
import { addOrganizationTag, findOrganizationBySlug } from "@/lib/repositories/organizations"
import { createTag, tagExists } from "@/lib/repositories/organization-tags"
import { requireDashboardSession } from "@/lib/auth/require-auth"
import { authorizeAddTag } from "@/lib/auth/org-tagging"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ slug: string }>
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const actor = await requireDashboardSession()
		const { slug } = await context.params
		const body = organizationTagSchema.parse(await readJson(request))
		const existing = await findOrganizationBySlug(slug)
		if (!existing) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}

		const decision = authorizeAddTag(actor, { slug: existing.slug, tags: existing.tags }, body.tag)
		if (!decision.ok) {
			return fail("FORBIDDEN", decision.error, decision.status)
		}

		if (!(await tagExists(body.tag))) {
			if (!body.create) {
				return fail(
					"VALIDATION_ERROR",
					`"${body.tag}" is not an existing tag. Pick one from the list or create it as a new tag.`,
					400,
				)
			}
			await createTag(body.tag, actor.id)
		}

		const organization = await addOrganizationTag(slug, body.tag)
		if (!organization) {
			return fail("NOT_FOUND", "Organization not found.", 404)
		}
		return ok({ organization }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
