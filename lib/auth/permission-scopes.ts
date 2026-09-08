import { PERMISSIONS, type Permission, type RoleRecord } from "@/types/domain"
import type { GrantResource } from "@/lib/auth/grants"

export type ScopeBinding = "org" | "none"

export type PermissionScopeSpec = {
	binding: ScopeBinding
	location: boolean
	tag: boolean
	id: boolean
	tagLabel: string
}

const ORG_ONLY: PermissionScopeSpec = {
	binding: "org",
	location: false,
	tag: false,
	id: false,
	tagLabel: "Tags",
}

const ORG_LOCATION_TAG_ID: PermissionScopeSpec = {
	binding: "org",
	location: true,
	tag: true,
	id: true,
	tagLabel: "Tags",
}

const ORG_TAG_ID: PermissionScopeSpec = {
	binding: "org",
	location: false,
	tag: true,
	id: true,
	tagLabel: "Tags",
}

const PLATFORM: PermissionScopeSpec = {
	binding: "none",
	location: false,
	tag: false,
	id: false,
	tagLabel: "Tags",
}

const CMS: PermissionScopeSpec = {
	binding: "none",
	location: false,
	tag: true,
	id: false,
	tagLabel: "Blog tags",
}

export const PERMISSION_SCOPE_SPEC: Record<Permission, PermissionScopeSpec> = {
	"dashboard:read": ORG_ONLY,
	"leads:read": PLATFORM,
	"leads:write": PLATFORM,
	"leads:delete": PLATFORM,
	"leads:notify": PLATFORM,
	"machines:read": ORG_LOCATION_TAG_ID,
	"machines:write": ORG_LOCATION_TAG_ID,
	"locations:read": ORG_TAG_ID,
	"locations:write": ORG_TAG_ID,
	"inventory:read": ORG_LOCATION_TAG_ID,
	"inventory:write": ORG_LOCATION_TAG_ID,
	"revenue:read": {
		binding: "org",
		location: true,
		tag: true,
		id: true,
		tagLabel: "Tags",
	},
	"users:read": ORG_TAG_ID,
	"users:write": ORG_TAG_ID,
	"users:delete": ORG_TAG_ID,
	"users:grant": ORG_TAG_ID,
	"roles:read": PLATFORM,
	"roles:write": PLATFORM,
	"settings:read": ORG_ONLY,
	"settings:write": ORG_ONLY,
	"cms:read": CMS,
	"cms:write": CMS,
	"orgs:all": PLATFORM,
	"system:admin": PLATFORM,
	"developer:read": PLATFORM,
}

export function scopeForPermission(permission: Permission): PermissionScopeSpec {
	return PERMISSION_SCOPE_SPEC[permission]
}

export function isOrgBoundPermission(permission: Permission): boolean {
	return PERMISSION_SCOPE_SPEC[permission].binding === "org"
}

export function isPlatformPermission(permission: Permission): boolean {
	return PERMISSION_SCOPE_SPEC[permission].binding === "none"
}

export function roleNeedsOrganization(role: Pick<RoleRecord, "permissions"> | null | undefined): boolean {
	return Boolean(role?.permissions.some(isOrgBoundPermission))
}

export function resourceBinding(resource: GrantResource): ScopeBinding {
	const match = PERMISSIONS.map((permission) => {
		const spec = PERMISSION_SCOPE_SPEC[permission]
		return { permission, spec }
	}).find(({ permission }) => permission.startsWith(`${resource}:`) || (resource === "system" && permission === "system:admin") || (resource === "orgs" && permission === "orgs:all"))
	return match?.spec.binding ?? "org"
}

export function extraGrantNeedsOrg(permission: Permission): boolean {
	return isOrgBoundPermission(permission)
}

export function extraGrantHasOptionalScopes(permission: Permission): boolean {
	const spec = PERMISSION_SCOPE_SPEC[permission]
	return spec.location || spec.tag || spec.id
}

