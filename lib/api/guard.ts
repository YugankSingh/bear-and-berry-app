import { ZodError } from "zod"
import { AuthError } from "@/lib/auth/require-auth"
import { RbacError } from "@/lib/auth/rbac"
import { fail } from "@/lib/api/response"
import { withCors } from "@/lib/api/cors"

export function handleApiError(error: unknown, request?: Request) {
	const headers = request ? withCors(request) : undefined

	if (error instanceof AuthError) {
		return fail(
			error.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
			error.message,
			error.status,
			headers,
		)
	}

	if (error instanceof RbacError) {
		return fail("FORBIDDEN", "You do not have access to this action.", 403, headers)
	}

	if (error instanceof ZodError) {
		const first = error.issues[0]
		return fail("VALIDATION_ERROR", first?.message ?? "Invalid request.", 400, headers)
	}

	if (error instanceof SyntaxError) {
		return fail("INVALID_PAYLOAD", "We could not read your request. Please try again.", 400, headers)
	}

	console.error("api error", error)
	return fail("SERVER_ERROR", "There was an unexpected issue. Please try again.", 500, headers)
}

export async function readJson(request: Request): Promise<unknown> {
	return request.json()
}
