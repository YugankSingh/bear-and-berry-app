import { machineCreateSchema } from "@/lib/validations/machine"
import { createMachine, listMachines } from "@/lib/repositories/machines"
import { requirePermission } from "@/lib/auth/require-auth"
import { ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		await requirePermission("machines:read")
		const machines = await listMachines()
		return ok({ machines })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		await requirePermission("machines:write")
		const body = machineCreateSchema.parse(await readJson(request))
		const machine = await createMachine(body)
		return ok({ machine }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
