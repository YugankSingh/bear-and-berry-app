import { leadUpdateSchema } from "@/lib/validations/lead"
import { setLeadArchived, updateLeadStatus } from "@/lib/repositories/leads"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"
import type { LeadRecord } from "@/types/domain"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		await requirePermission("leads:write")
		const { id } = await context.params
		const body = leadUpdateSchema.parse(await readJson(request))

		let lead: LeadRecord | null = null
		if (body.status !== undefined) {
			lead = await updateLeadStatus(id, body.status)
		}
		if (body.archived !== undefined) {
			lead = await setLeadArchived(id, body.archived)
		}
		if (!lead) {
			return fail("NOT_FOUND", "Lead not found.", 404)
		}
		return ok({ lead })
	} catch (error) {
		return handleApiError(error)
	}
}
