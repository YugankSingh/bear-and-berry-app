import { userPatchSchema } from "@/lib/validations/user"
import { updateUser } from "@/lib/repositories/users"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const actor = await requirePermission("users:write")
		const { id } = await context.params
		const body = userPatchSchema.parse(await readJson(request))

		if (body.role === "super_admin" && actor.role !== "super_admin") {
			return fail("FORBIDDEN", "Only a super admin can assign that role.", 403)
		}

		const user = await updateUser(id, body)
		if (!user) {
			return fail("NOT_FOUND", "User not found.", 404)
		}
		return ok({ user })
	} catch (error) {
		return handleApiError(error)
	}
}
