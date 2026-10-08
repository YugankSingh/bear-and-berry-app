import { hasAnyPermission } from "@/lib/auth/rbac"
import { AuthError, requireDashboardSession, requireSystemAdmin } from "@/lib/auth/require-auth"
import { hasUnrestrictedAccess } from "@/lib/auth/permissions"
import { createOrganization, listOrganizations } from "@/lib/repositories/organizations"
import { ensureTags } from "@/lib/repositories/organization-tags"
import { organizationCreateSchema } from "@/lib/validations/organization"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		const user = await requireDashboardSession()
		if (!hasAnyPermission(user, ["users:read", "locations:read", "machines:read"])) {
			throw new AuthError("You do not have access to this resource.", 403)
		}
		const organizations = await listOrganizations()
		const visible = hasUnrestrictedAccess(user)
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

export async function POST(request: Request) {
	try {
		const actor = await requireSystemAdmin()
		const body = organizationCreateSchema.parse(await readJson(request))
		const organization = await createOrganization(body)
		if (!organization) {
			return fail("CONFLICT", "An organization with that slug already exists.", 409)
		}
		await ensureTags(organization.tags, actor.id)
		return ok({ organization }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
