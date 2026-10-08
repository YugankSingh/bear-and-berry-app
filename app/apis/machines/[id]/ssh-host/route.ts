import { requirePermission } from "@/lib/auth/require-auth"
import { canSeeMachine } from "@/lib/auth/fleet-access"
import { findMachineById, updateMachine } from "@/lib/repositories/machines"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"
import { z } from "zod"

const sshHostSchema = z.object({
	sshHost: z.string().trim().min(1).max(255).nullable(),
})

type RouteContext = {
	params: Promise<{ id: string }>
}

/** Platform-admin path to set WireGuard / SSH host for copy-command UX. */
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const user = await requirePermission("devices:pair")
		const { id } = await context.params
		const machine = await findMachineById(id)
		if (!machine) {
			return fail("NOT_FOUND", "Machine not found.", 404)
		}
		if (!canSeeMachine(user, machine)) {
			return fail("FORBIDDEN", "You do not have access to that machine.", 403)
		}

		const body = sshHostSchema.parse(await readJson(request))
		const updated = await updateMachine(id, { sshHost: body.sshHost })
		if (!updated) {
			return fail("NOT_FOUND", "Machine not found.", 404)
		}
		return ok({ machine: updated })
	} catch (error) {
		return handleApiError(error)
	}
}
