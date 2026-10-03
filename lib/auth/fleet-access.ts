import { hasAllOrganizations, isSystemAdmin } from "@/lib/auth/permissions"
import { hasGrant, hasOrgWildcard } from "@/lib/auth/grants"
import type { LocationRecord, MachineRecord, SessionUser } from "@/types/domain"

export function orgSlugFromPath(path: string): string {
	return path.split("/").filter(Boolean)[0] ?? ""
}

function orgTagsFor(user: Pick<SessionUser, "accessibleOrgs">, slug: string): string[] {
	return user.accessibleOrgs?.find((org) => org.slug === slug)?.tags ?? []
}

export function canSeeLocation(
	user: Pick<SessionUser, "permissions" | "grants" | "accessibleOrgs">,
	location: Pick<LocationRecord, "id" | "orgSlug" | "tags">,
): boolean {
	if (isSystemAdmin(user) || hasAllOrganizations(user) || hasOrgWildcard(user.grants)) {
		return true
	}
	if (user.grants?.length) {
		return hasGrant(user.grants, {
			resource: "locations",
			action: "view",
			org: location.orgSlug,
			orgTags: orgTagsFor(user, location.orgSlug),
			tags: location.tags,
			id: location.id,
		})
	}
	return false
}

export function canSeeMachine(
	user: Pick<SessionUser, "permissions" | "grants" | "accessibleOrgs">,
	machine: Pick<MachineRecord, "id" | "orgSlug" | "locationId" | "tags">,
): boolean {
	if (isSystemAdmin(user) || hasAllOrganizations(user) || hasOrgWildcard(user.grants)) {
		return true
	}
	if (user.grants?.length) {
		return hasGrant(user.grants, {
			resource: "machines",
			action: "view",
			org: machine.orgSlug,
			orgTags: orgTagsFor(user, machine.orgSlug),
			tags: machine.tags,
			location: machine.locationId,
			id: machine.id,
		})
	}
	return false
}

export function filterLocations<T extends Pick<LocationRecord, "id" | "orgSlug" | "tags">>(
	user: Pick<SessionUser, "permissions" | "grants" | "accessibleOrgs">,
	locations: T[],
): T[] {
	return locations.filter((location) => canSeeLocation(user, location))
}

export function filterMachines<T extends Pick<MachineRecord, "id" | "orgSlug" | "locationId" | "tags">>(
	user: Pick<SessionUser, "permissions" | "grants" | "accessibleOrgs">,
	machines: T[],
): T[] {
	return machines.filter((machine) => canSeeMachine(user, machine))
}
