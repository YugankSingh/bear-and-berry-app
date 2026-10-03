import { hasAnyPermission } from "@/lib/auth/rbac"
import { AuthError, requireDashboardSession } from "@/lib/auth/require-auth"
import { hasAllOrganizations, isSystemAdmin } from "@/lib/auth/permissions"
import { hasOrgWildcard } from "@/lib/auth/grants"
import { listOrganizations } from "@/lib/repositories/organizations"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requireDashboardSession()
		if (!hasAnyPermission(user, ["users:read", "locations:read", "machines:read"])) {
			throw new AuthError("You do not have access to this resource.", 403)
		}
		const organizations = await listOrganizations()
		const unrestricted =
			isSystemAdmin(user) || hasAllOrganizations(user) || hasOrgWildcard(user.grants)
		const visible = unrestricted
			? organizations
			: organizations.filter(
					(org) =>
						user.accessibleOrgs.some((item) => item.slug === org.slug) ||
						org.slug === user.orgSlug,
				)
		return ok({ organizations: visible })
	} catch (error) {
		return handleApiError(error)
	}
}
