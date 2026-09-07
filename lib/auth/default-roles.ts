import { PERMISSIONS, type Permission } from "@/types/domain"

const ALL_PERMISSIONS = [...PERMISSIONS]

const ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter(
	(permission) =>
		permission !== "settings:write" &&
		permission !== "system:admin" &&
		permission !== "orgs:all" &&
		permission !== "roles:write" &&
		permission !== "developer:read",
)

const OPERATOR_PERMISSIONS: Permission[] = [
	"dashboard:read",
	"leads:read",
	"machines:read",
	"locations:read",
	"inventory:read",
	"inventory:write",
	"revenue:read",
	"settings:read",
]

const VIEWER_PERMISSIONS: Permission[] = [
	"dashboard:read",
	"leads:read",
	"machines:read",
	"locations:read",
	"inventory:read",
	"revenue:read",
	"settings:read",
]

export type DefaultRoleSeed = {
	slug: string
	name: string
	description: string
	rank: number
	permissions: Permission[]
	isSystem: boolean
}

export const DEFAULT_ROLES: DefaultRoleSeed[] = [
	{
		slug: "super_admin",
		name: "Super admin",
		description: "Full access across every organization.",
		rank: 100,
		permissions: ALL_PERMISSIONS,
		isSystem: true,
	},
	{
		slug: "admin",
		name: "Admin",
		description: "Manages one organization and its team.",
		rank: 80,
		permissions: ADMIN_PERMISSIONS,
		isSystem: true,
	},
	{
		slug: "developer",
		name: "Developer",
		description: "Sees runtime and database diagnostics. Not shown on normal settings.",
		rank: 85,
		permissions: ["dashboard:read", "settings:read", "developer:read"],
		isSystem: true,
	},
	{
		slug: "operator",
		name: "Operator",
		description: "Runs day-to-day inventory and fleet visibility.",
		rank: 50,
		permissions: OPERATOR_PERMISSIONS,
		isSystem: true,
	},
	{
		slug: "viewer",
		name: "Viewer",
		description: "Read-only access inside one organization.",
		rank: 10,
		permissions: VIEWER_PERMISSIONS,
		isSystem: true,
	},
]
