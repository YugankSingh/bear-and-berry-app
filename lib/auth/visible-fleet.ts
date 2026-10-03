import { hasAllOrganizations, isSystemAdmin } from "@/lib/auth/permissions"
import { filterLocations, filterMachines } from "@/lib/auth/fleet-access"
import { hasOrgWildcard } from "@/lib/auth/grants"
import { listLocations } from "@/lib/repositories/locations"
import { listMachines } from "@/lib/repositories/machines"
import { listInventory } from "@/lib/repositories/inventory"
import { listOrganizations } from "@/lib/repositories/organizations"
import type { MachineRecord, SessionUser } from "@/types/domain"

function resolveFleetOrgSlugs(user: SessionUser): string[] | undefined {
	if (user.activeOrgSlug) {
		return [user.activeOrgSlug]
	}
	if (isSystemAdmin(user) || hasAllOrganizations(user) || hasOrgWildcard(user.grants)) {
		return undefined
	}
	const slugs = user.accessibleOrgs.map((org) => org.slug).filter(Boolean)
	return slugs.length > 0 ? slugs : [user.orgSlug]
}

export async function loadVisibleFleet(user: SessionUser) {
	const orgSlugs = resolveFleetOrgSlugs(user)
	const [machines, locations, organizations] = await Promise.all([
		listMachines(orgSlugs ? { orgSlugs } : {}),
		listLocations(orgSlugs ? { orgSlugs } : {}),
		listOrganizations(),
	])

	const visibleMachines = filterMachines(user, machines)
	const visibleLocations = filterLocations(user, locations)

	const visibleOrgs = organizations.filter(
		(org) =>
			(user.activeOrgSlug ? org.slug === user.activeOrgSlug : true) &&
			(hasAllOrganizations(user) ||
				hasOrgWildcard(user.grants) ||
				user.accessibleOrgs.some((item) => item.slug === org.slug) ||
				visibleLocations.some((location) => location.orgSlug === org.slug) ||
				visibleMachines.some((machine) => machine.orgSlug === org.slug)),
	)

	return {
		machines: visibleMachines,
		locations: visibleLocations,
		organizations: visibleOrgs,
		allMachines: machines,
		allLocations: locations,
	}
}

export async function loadVisibleInventory(
	user: SessionUser,
	machines?: MachineRecord[],
) {
	const visibleMachines = machines ?? (await loadVisibleFleet(user)).machines
	const allowed = visibleMachines.map((machine) => machine.id)
	if (allowed.length === 0) {
		return []
	}
	const slots = await listInventory({ machineIds: allowed })
	const allowedSet = new Set(allowed)
	return slots.filter((slot) => allowedSet.has(slot.machineId))
}
