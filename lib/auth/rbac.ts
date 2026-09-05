import { PERMISSIONS, type Permission, type Role } from "@/types/domain"

const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
	super_admin: ALL_PERMISSIONS,
	admin: ALL_PERMISSIONS.filter((permission) => permission !== "settings:write"),
	operator: [
		"dashboard:read",
		"leads:read",
		"machines:read",
		"locations:read",
		"inventory:read",
		"inventory:write",
		"revenue:read",
		"settings:read",
	],
	viewer: [
		"dashboard:read",
		"leads:read",
		"machines:read",
		"locations:read",
		"inventory:read",
		"revenue:read",
		"settings:read",
	],
}

export function permissionsForRole(role: Role): readonly Permission[] {
	return ROLE_PERMISSIONS[role]
}

export function hasPermission(role: Role, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role].includes(permission)
}

export function hasAnyPermission(role: Role, permissions: readonly Permission[]): boolean {
	return permissions.some((permission) => hasPermission(role, permission))
}

export function assertPermission(role: Role, permission: Permission): void {
	if (!hasPermission(role, permission)) {
		throw new RbacError(permission)
	}
}

export class RbacError extends Error {
	readonly permission: Permission

	constructor(permission: Permission) {
		super(`Missing permission: ${permission}`)
		this.name = "RbacError"
		this.permission = permission
	}
}

export const NAV_ITEMS = [
	{
		href: "/overview",
		label: "Overview",
		permission: "dashboard:read",
	},
	{
		href: "/machines",
		label: "Machines",
		permission: "machines:read",
	},
	{
		href: "/locations",
		label: "Locations",
		permission: "locations:read",
	},
	{
		href: "/leads",
		label: "Leads",
		permission: "leads:read",
	},
	{
		href: "/inventory",
		label: "Inventory",
		permission: "inventory:read",
	},
	{
		href: "/revenue",
		label: "Revenue",
		permission: "revenue:read",
	},
	{
		href: "/team",
		label: "Team",
		permission: "users:read",
	},
	{
		href: "/settings",
		label: "Settings",
		permission: "settings:read",
	},
] as const

export type NavItem = (typeof NAV_ITEMS)[number]

export function visibleNavItems(role: Role): readonly NavItem[] {
	return NAV_ITEMS.filter((item) => hasPermission(role, item.permission))
}
