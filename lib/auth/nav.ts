import type { Permission } from "@/types/domain"

export const ADMIN_NAV = [
	{ href: "/admin", label: "Overview", permission: "dashboard:read" as Permission },
	{ href: "/admin/organizations", label: "Organizations", permission: "orgs:all" as Permission },
	{ href: "/admin/team", label: "Team", permission: "users:read" as Permission },
	{ href: "/admin/roles", label: "Roles", permission: "roles:read" as Permission },
	{ href: "/admin/leads", label: "Leads", permission: "leads:read" as Permission },
	{ href: "/admin/cms/blog", label: "Blog CMS", permission: "cms:read" as Permission },
	{ href: "/admin/developer", label: "Developer", permission: "developer:read" as Permission },
] as const

export const ORG_NAV = [
	{ href: "/overview", label: "Overview", permission: "dashboard:read" as Permission },
	{ href: "/machines", label: "Machines", permission: "machines:read" as Permission },
	{ href: "/locations", label: "Locations", permission: "locations:read" as Permission },
	{ href: "/inventory", label: "Inventory", permission: "inventory:read" as Permission },
	{ href: "/revenue", label: "Revenue", permission: "revenue:read" as Permission },
	{ href: "/team", label: "Team", permission: "users:read" as Permission },
	{ href: "/settings", label: "Settings", permission: "settings:read" as Permission },
] as const

export type WorkspaceKind = "admin" | "org" | "picker"
