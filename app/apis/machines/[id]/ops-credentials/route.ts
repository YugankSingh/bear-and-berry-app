import { requirePermission } from "@/lib/auth/require-auth"
import { canSeeMachine } from "@/lib/auth/fleet-access"
import { findMachineById } from "@/lib/repositories/machines"
import { revealOpsPassword } from "@/lib/repositories/device-provisioning"
import { buildSshCommand } from "@/lib/devices/ssh-host"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
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
		if (!machine.hasOpsPassword || !machine.opsUsername) {
			return fail("NOT_FOUND", "Ops credentials have not been provisioned yet.", 404)
		}

		const password = await revealOpsPassword(id)
		if (!password) {
			return fail("NOT_FOUND", "Ops password is unavailable.", 404)
		}

		const sshCommand = buildSshCommand(machine.opsUsername, machine.sshHost)

		return ok({
			opsUsername: machine.opsUsername,
			opsPassword: password,
			sshHost: machine.sshHost,
			sshCommand,
			installState: machine.installState,
		})
	} catch (error) {
		return handleApiError(error)
	}
}
