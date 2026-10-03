import { hasPermission, isSystemAdmin } from "@/lib/auth/permissions"

export type UserPatchAuthBody = {
	extraGrants?: unknown
	role?: unknown
	membership?: unknown
	name?: unknown
	tags?: unknown
	isActive?: unknown
	accessStatus?: unknown
}

export type UserPatchAuthActor = {
	permissions?: readonly string[]
	grants?: import("@/lib/auth/grants").AccessGrant[]
}

export type UserPatchAuthResult =
	| { ok: true; extraOnly: boolean }
	| { ok: false; status: 403; error: string }

export function authorizeUserPatch(
	actor: UserPatchAuthActor,
	body: UserPatchAuthBody,
): UserPatchAuthResult {
	const touchesExtras = body.extraGrants !== undefined
	const extraOnly =
		touchesExtras &&
		body.role === undefined &&
		body.membership === undefined &&
		body.name === undefined &&
		body.tags === undefined &&
		body.isActive === undefined &&
		body.accessStatus === undefined

	if (touchesExtras && !hasPermission(actor, "users:grant") && !isSystemAdmin(actor)) {
		return { ok: false, status: 403, error: "You cannot grant extra permissions." }
	}
	if (!extraOnly && !hasPermission(actor, "users:write") && !isSystemAdmin(actor)) {
		return { ok: false, status: 403, error: "You do not have access to this resource." }
	}
	return { ok: true, extraOnly }
}
