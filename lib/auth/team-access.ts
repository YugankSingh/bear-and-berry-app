import { hasAllOrganizations, isSystemAdmin, isOwnerRole } from "@/lib/auth/permissions"
import {
	GRANT_WILDCARD,
	hasOrgWildcard,
	membershipCoversOrg,
	type OrgMembership,
} from "@/lib/auth/grants"
import type { AccessibleOrg, RoleRecord, SessionUser, UserRecord } from "@/types/domain"

export function hasUnrestrictedAccess(
	user: Pick<SessionUser, "permissions" | "grants">,
): boolean {
	return isSystemAdmin(user) || hasAllOrganizations(user) || hasOrgWildcard(user.grants)
}

export function canAssignRole(
	actor: Pick<SessionUser, "roleRank" | "permissions" | "grants">,
	targetRole: Pick<RoleRecord, "rank" | "permissions" | "slug">,
): boolean {
	if (isOwnerRole(targetRole)) {
		return false
	}
	if (isSystemAdmin(actor)) {
		return true
	}
	return targetRole.rank < actor.roleRank
}

export function assignableRoles(
	actor: Pick<SessionUser, "roleRank" | "permissions" | "grants">,
	roles: RoleRecord[],
): RoleRecord[] {
	return roles.filter((role) => canAssignRole(actor, role))
}

export function actorAccessibleOrgs(
	actor: Pick<SessionUser, "accessibleOrgs" | "activeOrgSlug" | "orgSlug">,
): AccessibleOrg[] {
	return actor.accessibleOrgs ?? []
}

export function inSameOrganization(
	actor: Pick<SessionUser, "permissions" | "orgSlug" | "grants" | "accessibleOrgs" | "activeOrgSlug">,
	target: Pick<UserRecord, "orgSlug" | "memberships" | "tags">,
): boolean {
	if (hasAllOrganizations(actor) || isSystemAdmin(actor) || hasOrgWildcard(actor.grants)) {
		return true
	}
	const active = actor.activeOrgSlug || actor.orgSlug
	if (target.orgSlug === active || target.orgSlug === actor.orgSlug) {
		return true
	}
	if (target.memberships.some((membership) => membership.org === active || membership.org === GRANT_WILDCARD)) {
		return true
	}
	const activeOrg = actor.accessibleOrgs?.find((org) => org.slug === active)
	return target.memberships.some(
		(membership) => membership.orgTag && activeOrg?.tags.includes(membership.orgTag),
	)
}

export function canManageUser(
	actor: Pick<SessionUser, "id" | "roleRank" | "permissions" | "grants" | "orgSlug" | "accessibleOrgs" | "activeOrgSlug">,
	target: Pick<UserRecord, "id" | "roleRank" | "orgSlug" | "memberships" | "tags">,
): boolean {
	if (actor.id === target.id) {
		return false
	}
	if (isSystemAdmin(actor)) {
		return true
	}
	if (target.roleRank >= actor.roleRank) {
		return false
	}
	return inSameOrganization(actor, target)
}

export function canSeeTeamMember(
	actor: Pick<SessionUser, "id" | "roleRank" | "permissions" | "grants" | "orgSlug" | "accessibleOrgs" | "activeOrgSlug">,
	target: Pick<UserRecord, "id" | "roleRank" | "orgSlug" | "memberships" | "tags">,
): boolean {
	if (actor.id === target.id) {
		return true
	}
	if (isSystemAdmin(actor) || hasAllOrganizations(actor)) {
		return true
	}
	return inSameOrganization(actor, target) && canManageUser(actor, target)
}

/** True when the actor may assign these org memberships (blocks cross-org invites for org admins). */
export function canGrantMemberships(
	actor: Pick<SessionUser, "permissions" | "grants" | "accessibleOrgs" | "activeOrgSlug" | "orgSlug">,
	memberships: readonly OrgMembership[],
	catalog: readonly Pick<AccessibleOrg, "slug" | "tags">[],
): boolean {
	if (memberships.length === 0) {
		return true
	}
	if (isSystemAdmin(actor) || hasAllOrganizations(actor) || hasOrgWildcard(actor.grants)) {
		return memberships.every((membership) => membership.org !== GRANT_WILDCARD || hasOrgWildcard(actor.grants))
	}
	return memberships.every((membership) => membershipWithinActor(actor, membership, catalog))
}

function membershipWithinActor(
	actor: Pick<SessionUser, "accessibleOrgs" | "activeOrgSlug" | "orgSlug" | "grants">,
	membership: OrgMembership,
	catalog: readonly Pick<AccessibleOrg, "slug" | "tags">[],
): boolean {
	if (membership.org === GRANT_WILDCARD) {
		return false
	}
	if (membership.org) {
		return catalog.some((org) => org.slug === membership.org && actorAccessibleOrgs(actor).some((item) => item.slug === org.slug))
	}
	if (membership.orgTag) {
		return catalog.some(
			(org) =>
				org.tags.includes(membership.orgTag!) &&
				actorAccessibleOrgs(actor).some((item) => item.slug === org.slug),
		)
	}
	return false
}

export function memberVisibleInOrg(
	member: Pick<UserRecord, "orgSlug" | "memberships">,
	activeOrgSlug: string,
): boolean {
	if (!activeOrgSlug) {
		return true
	}
	return (
		member.orgSlug === activeOrgSlug ||
		member.memberships.some(
			(membership) => membership.org === activeOrgSlug || membership.org === GRANT_WILDCARD,
		)
	)
}

export function summarizeMemberships(memberships: readonly OrgMembership[]): string {
	const parts: string[] = []
	for (const membership of memberships) {
		if (membership.org === GRANT_WILDCARD) {
			return "All organizations"
		}
		if (membership.org) {
			parts.push(membership.org)
		} else if (membership.orgTag) {
			parts.push(`org tag ${membership.orgTag}`)
		}
	}
	return parts.join(" · ") || "Platform"
}

export function membershipCoversCatalogOrg(membership: OrgMembership, org: Pick<AccessibleOrg, "slug" | "tags">): boolean {
	return membershipCoversOrg(membership, org)
}
