import { rolePatchSchema } from "@/lib/validations/role"
import { findRoleBySlug, updateRole } from "@/lib/repositories/roles"
import { AuthError, requirePermission } from "@/lib/auth/require-auth"
import { isSystemAdmin } from "@/lib/auth/permissions"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ slug: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const actor = await requirePermission("roles:write")
		if (!isSystemAdmin(actor)) {
			throw new AuthError("Only a super admin can reassign role permissions.", 403)
		}
		const { slug } = await context.params
		const existing = await findRoleBySlug(slug)
		if (!existing) {
			return fail("NOT_FOUND", "Role not found.", 404)
		}
		const body = rolePatchSchema.parse(await readJson(request))
		const role = await updateRole(slug, body)
		if (!role) {
			return fail("NOT_FOUND", "Role not found.", 404)
		}
		return ok({ role })
	} catch (error) {
		return handleApiError(error)
	}
}
