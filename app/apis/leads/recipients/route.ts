import { leadRecipientCreateSchema } from "@/lib/validations/lead-recipient"
import { addLeadRecipient, listLeadRecipients } from "@/lib/repositories/lead-recipients"
import { requirePermission } from "@/lib/auth/require-auth"
import { ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		await requirePermission("leads:notify")
		const recipients = await listLeadRecipients()
		return ok({ recipients })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		await requirePermission("leads:notify")
		const body = leadRecipientCreateSchema.parse(await readJson(request))
		const recipient = await addLeadRecipient(body.email)
		return ok({ recipient }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
