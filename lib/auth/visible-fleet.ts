import { hasUnrestrictedAccess } from "@/lib/auth/permissions"
import { filterLocations, filterMachines } from "@/lib/auth/fleet-access"
import { listLocations } from "@/lib/repositories/locations"
import { listMachines } from "@/lib/repositories/machines"
import { listInventory } from "@/lib/repositories/inventory"
import { listOrganizations } from "@/lib/repositories/organizations"
import type { MachineRecord, OrganizationRecord, SessionUser } from "@/types/domain"

/** `undefined` means no org filter (unrestricted admin catalog). */
function fleetOrgSlugs(user: SessionUser): string[] | undefined {
	if (user.activeOrgSlug) {
		return [user.activeOrgSlug]
	}
	if (hasUnrestrictedAccess(user)) {
		return undefined
	}
	const slugs = user.accessibleOrgs.map((org) => org.slug).filter(Boolean)
	return slugs.length > 0 ? slugs : [user.orgSlug]
}

function isVisibleOrg(user: SessionUser, org: OrganizationRecord, machines: MachineRecord[], locations: { orgSlug: string }[]): boolean {
	if (user.activeOrgSlug && org.slug !== user.activeOrgSlug) {
		return false
	}
	if (hasUnrestrictedAccess(user)) {
		return true
	}
	return (
		user.accessibleOrgs.some((item) => item.slug === org.slug) ||
		locations.some((location) => location.orgSlug === org.slug) ||
		machines.some((machine) => machine.orgSlug === org.slug)
	)
}

export async function loadVisibleFleet(user: SessionUser) {
	const orgSlugs = fleetOrgSlugs(user)
	const scope = orgSlugs ? { orgSlugs } : {}
	const [machines, locations, organizations] = await Promise.all([
		listMachines(scope),
		listLocations(scope),
		listOrganizations(),
	])

	const visibleMachines = filterMachines(user, machines)
	const visibleLocations = filterLocations(user, locations)

	return {
		machines: visibleMachines,
		locations: visibleLocations,
		organizations: organizations.filter((org) => isVisibleOrg(user, org, visibleMachines, visibleLocations)),
	}
}

export async function loadVisibleInventory(user: SessionUser, machines?: MachineRecord[]) {
	const visibleMachines = machines ?? (await loadVisibleFleet(user)).machines
	const machineIds = visibleMachines.map((machine) => machine.id)
	if (machineIds.length === 0) {
		return []
	}
	return listInventory({ machineIds })
}
