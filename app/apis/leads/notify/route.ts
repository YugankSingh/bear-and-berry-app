import { NextResponse } from "next/server"
import { leadNotifySchema } from "@/lib/validations/lead"
import { getLeadById } from "@/lib/repositories/leads"
import { notifyLeadIngest } from "@/lib/leads/notify"
import { hasValidIngestKey } from "@/lib/leads/ingest-key"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"
import { withCors } from "@/lib/api/cors"

export function OPTIONS(request: Request) {
	return new NextResponse(null, {
		status: 204,
		headers: withCors(request),
	})
}

export async function POST(request: Request) {
	const headers = withCors(request)

	try {
		if (!hasValidIngestKey(request)) {
			return fail("UNAUTHORIZED", "A valid ingest key is required.", 401, headers)
		}

		const parsed = leadNotifySchema.safeParse(await readJson(request))
		if (!parsed.success) {
			return fail("INVALID_PAYLOAD", "A lead id is required.", 400, headers)
		}

		const lead = await getLeadById(parsed.data.leadId)
		if (!lead) {
			return fail("NOT_FOUND", "Lead not found.", 404, headers)
		}

		await notifyLeadIngest(lead)
		return ok({ sent: true }, 200, headers)
	} catch (error) {
		return handleApiError(error, request)
	}
}
