import { leadStatusSchema } from "@/lib/validations/lead"
import { updateLeadStatus } from "@/lib/repositories/leads"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		await requirePermission("leads:write")
		const { id } = await context.params
		const body = leadStatusSchema.parse(await readJson(request))
		const lead = await updateLeadStatus(id, body.status)
		if (!lead) {
			return fail("NOT_FOUND", "Lead not found.", 404)
		}
		return ok({ lead })
	} catch (error) {
		return handleApiError(error)
	}
}
