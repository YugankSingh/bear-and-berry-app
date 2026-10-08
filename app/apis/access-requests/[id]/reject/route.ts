import { findUserById, softDeleteUser } from "@/lib/repositories/users"
import { requirePermission } from "@/lib/auth/require-auth"
import { isUserRemoved, resolveAccessStatus } from "@/lib/auth/access"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
	try {
		await requirePermission("signups:reject")
		const { id } = await context.params
		const existing = await findUserById(id)
		if (!existing || isUserRemoved(existing) || resolveAccessStatus(existing.accessStatus) !== "waitlisted") {
			return fail("NOT_FOUND", "Access request not found.", 404)
		}

		const user = await softDeleteUser(id)
		if (!user) {
			return fail("NOT_FOUND", "Access request not found.", 404)
		}
		return ok({ user, rejected: true })
	} catch (error) {
		return handleApiError(error)
	}
}
