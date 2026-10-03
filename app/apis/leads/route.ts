import { NextResponse } from "next/server"
import { leadIngestSchema } from "@/lib/validations/lead"
import { createLead, listLeads } from "@/lib/repositories/leads"
import { hasValidIngestKey } from "@/lib/leads/ingest-key"
import { scheduleLeadNotify } from "@/lib/leads/trigger-notify"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"
import { withCors } from "@/lib/api/cors"

export function OPTIONS(request: Request) {
	return new NextResponse(null, {
		status: 204,
		headers: withCors(request),
	})
}

export async function GET(request: Request) {
	try {
		await requirePermission("leads:read")
		const archived = new URL(request.url).searchParams.get("archived") === "true"
		const leads = await listLeads({ archived })
		return ok({ leads })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	const headers = withCors(request)

	try {
		if (!hasValidIngestKey(request)) {
			return fail("UNAUTHORIZED", "A valid ingest key is required.", 401, headers)
		}

		const parsed = leadIngestSchema.safeParse(await readJson(request))
		if (!parsed.success) {
			const emailIssue = parsed.error.issues.find((issue) => issue.path.includes("email"))
			if (emailIssue) {
				return fail("EMAIL_REQUIRED", "Please enter a valid email address.", 400, headers)
			}
			return fail(
				"INVALID_PAYLOAD",
				"We could not read your request. Please try again.",
				400,
				headers,
			)
		}

		const lead = await createLead(parsed.data)
		scheduleLeadNotify(lead)
		return ok({ lead }, 201, headers)
	} catch (error) {
		return handleApiError(error, request)
	}
}
