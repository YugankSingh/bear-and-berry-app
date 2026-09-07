import type { AccessGrant } from "@/lib/auth/grants"
import { GRANT_WILDCARD, emptyGrant, fillRequiredWildcards, validateGrant } from "@/lib/auth/grants"
import { capabilityForPermission, permissionForCapability } from "@/lib/auth/compile-grants"
import { isOrgBoundPermission, scopeForPermission } from "@/lib/auth/permission-scopes"
import { isPermission, isReservedPermission } from "@/lib/auth/permissions"
import type { Permission } from "@/types/domain"

export type ExtraGrantDraft = {
	key: string
	permission: Permission | ""
	scopeMode: "org" | "orgtag"
	org: string
	orgTag: string
	location: string
	tag: string
	id: string
}

export function emptyExtraGrantDraft(key: string): ExtraGrantDraft {
	return {
		key,
		permission: "",
		scopeMode: "org",
		org: "",
		orgTag: "",
		location: "",
		tag: "",
		id: "",
	}
}

function optionalScope(value: string): string | null {
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : GRANT_WILDCARD
}

function explicitScope(value: string): string | null {
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : null
}

export function extraGrantFromDraft(draft: ExtraGrantDraft): AccessGrant | string {
	if (!draft.permission || !isPermission(draft.permission)) {
		return "Choose a permission."
	}
	if (isReservedPermission(draft.permission)) {
		return "That permission cannot be granted here."
	}
	const capability = capabilityForPermission(draft.permission)
	if (!capability) {
		return "That permission cannot be expressed as a grant."
	}
	const spec = scopeForPermission(draft.permission)
	const grant = fillRequiredWildcards({
		...emptyGrant(capability.resource, capability.action),
		org: spec.binding === "org" && draft.scopeMode === "org" ? explicitScope(draft.org) : null,
		orgTag: spec.binding === "org" && draft.scopeMode === "orgtag" ? explicitScope(draft.orgTag) : null,
		location: spec.location ? optionalScope(draft.location) : null,
		tag: spec.tag ? optionalScope(draft.tag) : null,
		id: spec.id ? explicitScope(draft.id) : null,
	})
	if (spec.binding === "org" && !grant.org && !grant.orgTag) {
		return "Choose an organization or an organization tag for this permission."
	}
	return validateGrant(grant) ?? grant
}

export function draftFromGrant(grant: AccessGrant, key: string): ExtraGrantDraft {
	const permission = permissionForCapability(grant.resource, grant.action)
	return {
		key,
		permission: permission && !isReservedPermission(permission) ? permission : "",
		scopeMode: grant.orgTag && !grant.org ? "orgtag" : "org",
		org: grant.org && grant.org !== GRANT_WILDCARD ? grant.org : grant.org === GRANT_WILDCARD ? GRANT_WILDCARD : "",
		orgTag: grant.orgTag ?? "",
		location: grant.location && grant.location !== GRANT_WILDCARD ? grant.location : "",
		tag: grant.tag && grant.tag !== GRANT_WILDCARD ? grant.tag : "",
		id: grant.id && grant.id !== GRANT_WILDCARD ? grant.id : "",
	}
}

export function extraGrantsFromDrafts(drafts: readonly ExtraGrantDraft[]): AccessGrant[] | string {
	const grants: AccessGrant[] = []
	for (const draft of drafts) {
		if (!draft.permission) {
			return "Choose a permission for each extra grant, or remove the empty ones."
		}
		const result = extraGrantFromDraft(draft)
		if (typeof result === "string") {
			return result
		}
		grants.push(result)
	}
	return grants
}

export function isOrgBoundPermissionDraft(permission: Permission | ""): boolean {
	return Boolean(permission && isOrgBoundPermission(permission))
}
