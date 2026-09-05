import { userCreateSchema } from "@/lib/validations/user"
import { createUser, findUserByEmail, listUsers } from "@/lib/repositories/users"
import { requirePermission } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		await requirePermission("users:read")
		const users = await listUsers()
		return ok({ users })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const actor = await requirePermission("users:write")
		const body = userCreateSchema.parse(await readJson(request))

		if (body.role === "super_admin" && actor.role !== "super_admin") {
			return fail("FORBIDDEN", "Only a super admin can create another super admin.", 403)
		}

		const existing = await findUserByEmail(body.email)
		if (existing) {
			return fail("CONFLICT", "A user with that email already exists.", 409)
		}

		const user = await createUser(body)
		return ok({ user }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
