import { roleWriteSchema } from "@/lib/validations/role"
import { createRole, listRoles } from "@/lib/repositories/roles"
import { AuthError, requireDashboardSession, requirePermission } from "@/lib/auth/require-auth"
import { hasAnyPermission, isSystemAdmin, sanitizeRolePermissions } from "@/lib/auth/permissions"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requireDashboardSession()
		if (!hasAnyPermission(user, ["roles:read", "users:read", "users:write"])) {
			throw new AuthError("You do not have access to this resource.", 403)
		}
		const roles = await listRoles()
		return ok({ roles })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const actor = await requirePermission("roles:write")
		if (!isSystemAdmin(actor)) {
			throw new AuthError("Only a super admin can reassign role permissions.", 403)
		}
		const body = roleWriteSchema.parse(await readJson(request))
		const existing = (await listRoles()).some((role) => role.slug === body.slug)
		if (existing) {
			return fail("CONFLICT", "A role with that slug already exists.", 409)
		}
		const role = await createRole({
			...body,
			permissions: sanitizeRolePermissions({ slug: body.slug, permissions: [] }, body.permissions),
		})
		return ok({ role }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
