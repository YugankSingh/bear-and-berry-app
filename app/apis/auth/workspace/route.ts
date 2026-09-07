import { z } from "zod"
import { requireDashboardSession } from "@/lib/auth/require-auth"
import { setSessionCookie, setWorkspaceCookie } from "@/lib/auth/session"
import { ADMIN_WORKSPACE, canAccessAdminWorkspace, canUseOrganization, organizationPath } from "@/lib/auth/workspace"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

const workspaceSchema = z.object({
	workspace: z.enum(["admin", "org"]),
	orgSlug: z.string().trim().min(2).max(80).optional(),
})

export async function POST(request: Request) {
	try {
		const user = await requireDashboardSession()
		const body = workspaceSchema.parse(await readJson(request))

		if (body.workspace === "admin") {
			if (!canAccessAdminWorkspace(user)) {
				return fail("FORBIDDEN", "You cannot open the platform workspace.", 403)
			}
			const next = { ...user, activeOrgSlug: "" }
			await setWorkspaceCookie(ADMIN_WORKSPACE)
			await setSessionCookie(next)
			return ok({ home: "/admin", workspace: ADMIN_WORKSPACE })
		}

		const orgSlug = body.orgSlug
		if (!orgSlug || !canUseOrganization(user, orgSlug)) {
			return fail("FORBIDDEN", "You cannot open that organization.", 403)
		}

		const org = user.accessibleOrgs.find((item) => item.slug === orgSlug)
		const next = {
			...user,
			activeOrgSlug: orgSlug,
			orgSlug: org?.slug ?? orgSlug,
		}
		await setWorkspaceCookie(orgSlug)
		await setSessionCookie(next)
		return ok({ home: organizationPath(org?.slug ?? orgSlug), workspace: orgSlug })
	} catch (error) {
		return handleApiError(error)
	}
}
