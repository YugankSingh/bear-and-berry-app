import { leadCommentCreateSchema } from "@/lib/validations/lead"
import { addLeadComment } from "@/lib/repositories/leads"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const user = await requirePermission("leads:write")
		const { id } = await context.params
		const body = leadCommentCreateSchema.parse(await readJson(request))
		const lead = await addLeadComment({
			id,
			body: body.body,
			authorId: user.id,
			authorName: user.name,
		})
		if (!lead) {
			return fail("NOT_FOUND", "Lead not found.", 404)
		}
		return ok({ lead }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
