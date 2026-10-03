import type { Permission, RoleRecord } from "@/types/domain"
import { compileGrants, permissionsFromGrants } from "@/lib/auth/compile-grants"
import { normalizeMemberships, stringifyGrants, type AccessGrant, type OrgMembership } from "@/lib/auth/grants"
import { resolvePermissions } from "@/lib/auth/permissions"
import { membershipsForUser } from "@/lib/auth/membership"

export type UserGrantSource = {
	role: string
	orgSlug: string
	memberships?: OrgMembership[] | null
	extraGrants?: AccessGrant[] | null
}

export function resolvedMemberships(
	source: UserGrantSource,
	role: Pick<RoleRecord, "slug" | "permissions"> | null | undefined,
): OrgMembership[] {
	if (source.memberships?.length) {
		return normalizeMemberships(source.memberships)
	}
	return membershipsForUser({
		roleSlug: source.role,
		rolePermissions: role?.permissions ?? [],
		homeOrgSlug: source.orgSlug,
	})
}

export function buildUserGrants(
	source: UserGrantSource,
	role: Pick<RoleRecord, "slug" | "permissions"> | null | undefined,
): {
	memberships: OrgMembership[]
	extraGrants: AccessGrant[]
	grants: AccessGrant[]
	grantKeys: string[]
	permissions: Permission[]
} {
	const memberships = resolvedMemberships(source, role)
	const extraGrants = source.extraGrants ?? []
	const grants = compileGrants({ role, memberships, extraGrants })
	const grantKeys = stringifyGrants(grants)
	const rolePermissions = resolvePermissions(role, [])
	const permissions = [...new Set([...rolePermissions, ...permissionsFromGrants(grants)])] as Permission[]
	return { memberships, extraGrants, grants, grantKeys, permissions }
}
