import { findOrganizationBySlug, listOrganizations } from "@/lib/repositories/organizations"
import {
	ALL_RESOURCE_ACCESS,
	emptyLimitedAccess,
	normalizeResourceAccess,
	resourceAccessFromMembership,
	validateAccessForRole,
} from "@/lib/auth/resource-access"
import { isOwnerRole, roleHasAllOrganizations } from "@/lib/auth/permissions"
import { roleNeedsOrganization } from "@/lib/auth/permission-scopes"
import { membershipsFromAccess } from "@/lib/auth/compile-grants"
import { VENDFORGE_LABS_SLUG } from "@/lib/auth/scope"
import type { OrganizationDocument } from "@/lib/db/documents"
import type { OrgMembership, ResourceAccess, RoleRecord } from "@/types/domain"

export type MembershipInput = {
	org?: string | null
	orgTag?: string | null
}

export async function resolveMembership(
	role: RoleRecord,
	access: ResourceAccess | null | undefined,
	fallbackSlug?: string,
	explicit?: MembershipInput | null,
): Promise<
	| { org: OrganizationDocument; resourceAccess: ResourceAccess; memberships: OrgMembership[] }
	| { error: string }
> {
	const fromExplicit = explicit ? resourceAccessFromMembership(explicit) : null
	if (explicit && (explicit.org || explicit.orgTag) && !fromExplicit) {
		return { error: "Choose an organization or an organization tag, not both." }
	}

	let resourceAccess: ResourceAccess
	if (isOwnerRole(role) || roleHasAllOrganizations(role)) {
		resourceAccess = ALL_RESOURCE_ACCESS
	} else if (fromExplicit) {
		resourceAccess = fromExplicit
	} else if (access) {
		resourceAccess = normalizeResourceAccess(access)
	} else if (!roleNeedsOrganization(role)) {
		resourceAccess = emptyLimitedAccess()
	} else {
		return { error: "Choose an organization or an organization tag." }
	}

	const accessError = validateAccessForRole(role, resourceAccess)
	if (accessError && resourceAccess.organizationTags.length === 0) {
		return { error: accessError }
	}

	const memberships = roleNeedsOrganization(role)
		? membershipsFromAccess({
				role: role.slug,
				resourceAccess,
				orgSlug: fallbackSlug,
				permissions: role.permissions,
			})
		: []

	if (roleNeedsOrganization(role) && memberships.length === 0) {
		return { error: "Choose an organization or an organization tag. Use * for every organization." }
	}

	const slug = await homeOrgSlug(resourceAccess, fallbackSlug, role)
	if (!slug) {
		return { error: roleNeedsOrganization(role)
			? "This role must belong to an organization or an organization tag."
			: "Could not resolve a home organization for this account." }
	}

	const org = await findOrganizationBySlug(slug)
	if (!org) {
		return { error: "Organization not found." }
	}

	return { org, resourceAccess, memberships }
}

async function homeOrgSlug(
	access: ResourceAccess,
	fallbackSlug: string | undefined,
	role: RoleRecord,
): Promise<string | null> {
	if (isOwnerRole(role) || roleHasAllOrganizations(role) || access.mode === "all") {
		return fallbackSlug ?? VENDFORGE_LABS_SLUG
	}
	if (access.organizationSlugs[0]) {
		return access.organizationSlugs[0]
	}
	if (access.organizationTags.length > 0) {
		const orgs = await listOrganizations()
		const match = orgs.find((org) => org.tags.some((tag) => access.organizationTags.includes(tag)))
		return match?.slug ?? fallbackSlug ?? VENDFORGE_LABS_SLUG
	}
	return fallbackSlug ?? VENDFORGE_LABS_SLUG
}
