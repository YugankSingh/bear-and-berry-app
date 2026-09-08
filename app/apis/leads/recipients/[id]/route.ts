import { removeLeadRecipient } from "@/lib/repositories/lead-recipients"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
	try {
		await requirePermission("leads:notify")
		const { id } = await context.params
		const removed = await removeLeadRecipient(id)
		if (!removed) {
			return fail("NOT_FOUND", "Recipient not found.", 404)
		}
		return ok({ removed: true })
	} catch (error) {
		return handleApiError(error)
	}
}
