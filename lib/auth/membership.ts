import { findOrganizationBySlug, listOrganizations } from "@/lib/repositories/organizations"
import { isOwnerRole, roleHasAllOrganizations } from "@/lib/auth/permissions"
import { roleNeedsOrganization } from "@/lib/auth/permission-scopes"
import { GRANT_WILDCARD, normalizeMemberships, type OrgMembership } from "@/lib/auth/grants"
import { ORGS_ALL_PERMISSION, SYSTEM_ADMIN_PERMISSION, type Permission, type RoleRecord } from "@/types/domain"
import { isOrgBoundPermission } from "@/lib/auth/permission-scopes"
import { VENDFORGE_LABS_SLUG } from "@/lib/auth/scope"
import type { OrganizationDocument } from "@/lib/db/documents"

export type MembershipInput = {
	org?: string | null
	orgTag?: string | null
}

export function membershipsForUser(input: {
	roleSlug: string
	rolePermissions: readonly Permission[]
	homeOrgSlug?: string | null
	explicit?: MembershipInput | null
}): OrgMembership[] {
	if (input.explicit?.org || input.explicit?.orgTag) {
		return normalizeMemberships([
			{
				org: input.explicit.org?.trim() || null,
				orgTag: input.explicit.orgTag?.trim() || null,
				role: input.roleSlug,
			},
		])
	}

	const perms = input.rolePermissions
	if (perms.includes(ORGS_ALL_PERMISSION) || perms.includes(SYSTEM_ADMIN_PERMISSION)) {
		return normalizeMemberships([{ org: GRANT_WILDCARD, orgTag: null, role: input.roleSlug }])
	}
	if (input.homeOrgSlug && perms.some(isOrgBoundPermission)) {
		return normalizeMemberships([{ org: input.homeOrgSlug, orgTag: null, role: input.roleSlug }])
	}
	return []
}

export async function resolveMembership(
	role: RoleRecord,
	fallbackSlug: string | undefined,
	explicit?: MembershipInput | null,
): Promise<{ org: OrganizationDocument; memberships: OrgMembership[] } | { error: string }> {
	if (explicit?.org?.trim() && explicit?.orgTag?.trim()) {
		return { error: "Choose an organization or an organization tag, not both." }
	}

	let memberships: OrgMembership[]
	if (!roleNeedsOrganization(role)) {
		memberships = []
	} else if (isOwnerRole(role) || roleHasAllOrganizations(role)) {
		memberships = normalizeMemberships([{ org: GRANT_WILDCARD, orgTag: null, role: role.slug }])
	} else if (explicit?.org || explicit?.orgTag) {
		memberships = membershipsForUser({
			roleSlug: role.slug,
			rolePermissions: role.permissions,
			explicit,
		})
	} else if (fallbackSlug) {
		memberships = membershipsForUser({
			roleSlug: role.slug,
			rolePermissions: role.permissions,
			homeOrgSlug: fallbackSlug,
		})
	} else {
		return { error: "Choose an organization or an organization tag." }
	}

	if (roleNeedsOrganization(role) && memberships.length === 0) {
		return { error: "Choose an organization or an organization tag. Use * for every organization." }
	}

	const slug = await homeOrgSlug(memberships, fallbackSlug, role)
	if (!slug) {
		return {
			error: roleNeedsOrganization(role)
				? "This role must belong to an organization or an organization tag."
				: "Could not resolve a home organization for this account.",
		}
	}

	const org = await findOrganizationBySlug(slug)
	if (!org) {
		return { error: "Organization not found." }
	}

	return { org, memberships }
}

async function homeOrgSlug(
	memberships: OrgMembership[],
	fallbackSlug: string | undefined,
	role: RoleRecord,
): Promise<string | null> {
	if (isOwnerRole(role) || roleHasAllOrganizations(role)) {
		return fallbackSlug ?? VENDFORGE_LABS_SLUG
	}
	const primary = memberships[0]
	if (!primary) {
		return fallbackSlug ?? VENDFORGE_LABS_SLUG
	}
	if (primary.org === GRANT_WILDCARD) {
		return fallbackSlug ?? VENDFORGE_LABS_SLUG
	}
	if (primary.org) {
		return primary.org
	}
	if (primary.orgTag) {
		const orgs = await listOrganizations()
		const match = orgs.find((org) => org.tags.includes(primary.orgTag!))
		return match?.slug ?? fallbackSlug ?? VENDFORGE_LABS_SLUG
	}
	return fallbackSlug ?? VENDFORGE_LABS_SLUG
}
