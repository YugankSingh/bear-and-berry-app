import { NextResponse } from "next/server"
import { getEnv, isProductionLike } from "@/lib/env"
import { leadIngestSchema } from "@/lib/validations/lead"
import { createLead, listLeads } from "@/lib/repositories/leads"
import { notifyLeadIngest } from "@/lib/leads/notify"
import { requirePermission } from "@/lib/auth/require-auth"
import { ensureDatabaseReady } from "@/lib/seed"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"
import { withCors } from "@/lib/api/cors"

function hasValidIngestKey(request: Request): boolean {
	const env = getEnv()
	const expected = env.LEADS_INGEST_API_KEY
	if (!expected) {
		return !isProductionLike()
	}

	const headerKey = request.headers.get("x-api-key")
	const bearer = request.headers.get("authorization")
	const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null
	return headerKey === expected || token === expected
}

export function OPTIONS(request: Request) {
	return new NextResponse(null, {
		status: 204,
		headers: withCors(request),
	})
}

export async function GET() {
	try {
		await requirePermission("leads:read")
		const leads = await listLeads()
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

		await ensureDatabaseReady()
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
		await notifyLeadIngest(lead)
		return ok({ lead }, 201, headers)
	} catch (error) {
		return handleApiError(error, request)
	}
}
