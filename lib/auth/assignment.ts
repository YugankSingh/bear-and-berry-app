import { roleHasAllOrganizations } from "@/lib/auth/permissions"
import { roleNeedsOrganization } from "@/lib/auth/permission-scopes"
import type { ExtraGrantDraft } from "@/lib/auth/extra-grants"
import { extraGrantsFromDrafts } from "@/lib/auth/extra-grants"
import type { MembershipFieldsValue } from "@/components/team/membership-fields"
import type { RoleRecord } from "@/types/domain"
import { GRANT_WILDCARD } from "@/lib/auth/grants"

export function membershipRequest(
	role: RoleRecord | undefined,
	fields: MembershipFieldsValue,
): { org?: string; orgTag?: string } | string | undefined {
	if (!roleNeedsOrganization(role)) {
		return undefined
	}
	if (roleHasAllOrganizations(role)) {
		return { org: GRANT_WILDCARD }
	}
	if (fields.mode === "org") {
		if (!fields.org.trim()) {
			return "Choose an organization for this role."
		}
		return { org: fields.org.trim() }
	}
	if (!fields.orgTag.trim()) {
		return "Choose an organization tag for this role."
	}
	return { orgTag: fields.orgTag.trim() }
}

export function extraGrantsRequest(drafts: ExtraGrantDraft[]): ReturnType<typeof extraGrantsFromDrafts> {
	return extraGrantsFromDrafts(drafts)
}
