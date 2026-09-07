import { hasAllOrganizations } from "@/lib/auth/permissions"
import { filterLocations, filterMachines, resolveResourceAccess } from "@/lib/auth/resource-access"
import { listLocations } from "@/lib/repositories/locations"
import { listMachines } from "@/lib/repositories/machines"
import { listInventory } from "@/lib/repositories/inventory"
import { listOrganizations } from "@/lib/repositories/organizations"
import type { SessionUser } from "@/types/domain"

export async function loadVisibleFleet(user: SessionUser) {
	const [machines, locations, organizations] = await Promise.all([
		listMachines(),
		listLocations(),
		listOrganizations(),
	])
	const access = resolveResourceAccess(user)
	let visibleMachines = filterMachines(user, machines)
	let visibleLocations = filterLocations(user, locations)
	if (user.activeOrgSlug) {
		visibleMachines = visibleMachines.filter((machine) => machine.orgSlug === user.activeOrgSlug)
		visibleLocations = visibleLocations.filter((location) => location.orgSlug === user.activeOrgSlug)
	}
	const visibleOrgs = organizations.filter(
		(org) =>
			(user.activeOrgSlug ? org.slug === user.activeOrgSlug : true) &&
			(hasAllOrganizations(user) ||
				user.accessibleOrgs.some((item) => item.slug === org.slug) ||
				access.mode === "all" ||
				access.organizationSlugs.includes(org.slug) ||
				access.organizationTags.some((tag) => org.tags.includes(tag)) ||
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

export async function loadVisibleInventory(user: SessionUser) {
	const { machines } = await loadVisibleFleet(user)
	const allowed = new Set(machines.map((machine) => machine.id))
	const slots = await listInventory()
	return slots.filter((slot) => allowed.has(slot.machineId))
}
