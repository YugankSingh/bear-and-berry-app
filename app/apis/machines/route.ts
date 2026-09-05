import { machineCreateSchema } from "@/lib/validations/machine"
import { createMachine, listMachines } from "@/lib/repositories/machines"
import { requirePermission } from "@/lib/auth/require-auth"
import { scopedFilter } from "@/lib/auth/scope"
import { ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requirePermission("machines:read")
		const machines = scopedFilter(user, await listMachines())
		return ok({ machines })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const user = await requirePermission("machines:write")
		const body = machineCreateSchema.parse(await readJson(request))
		const machine = await createMachine(body, user.orgId, user.orgSlug === "vendforge-labs" ? "bear-and-berry" : user.orgSlug)
		return ok({ machine }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}