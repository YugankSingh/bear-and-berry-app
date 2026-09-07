"use client"

import { roleHasAllOrganizations } from "@/lib/auth/permissions"
import { roleNeedsOrganization } from "@/lib/auth/permission-scopes"
import type { OrganizationRecord, RoleRecord } from "@/types/domain"

export type MembershipFieldsValue = {
	mode: "org" | "orgtag"
	org: string
	orgTag: string
}

type MembershipFieldsProps = {
	role: RoleRecord | undefined
	value: MembershipFieldsValue
	onChange: (value: MembershipFieldsValue) => void
	organizations: OrganizationRecord[]
	name?: string
}

export function emptyMembershipFields(organizations: OrganizationRecord[]): MembershipFieldsValue {
	return {
		mode: "org",
		org: organizations.length === 1 ? (organizations[0]?.slug ?? "") : "",
		orgTag: "",
	}
}

export function MembershipFields({
	role,
	value,
	onChange,
	organizations,
	name = "membership",
}: MembershipFieldsProps) {
	if (!roleNeedsOrganization(role)) {
		return (
			<p className="text-[13px] leading-[1.6] text-[#8C8C8C] md:col-span-2">
				This role’s permissions are not tied to an organization.
			</p>
		)
	}
	if (roleHasAllOrganizations(role)) {
		return (
			<p className="text-[13px] leading-[1.6] text-[#8C8C8C] md:col-span-2">
				This role can see every organization. Platform permissions such as CMS stay unbound.
			</p>
		)
	}

	const orgTags = [...new Set(organizations.flatMap((org) => org.tags))].sort()

	return (
		<div className="space-y-3 md:col-span-2">
			<p className="text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
				Organization for this role
			</p>
			<p className="text-[13px] leading-[1.6] text-[#8C8C8C]">
				Org-bound permissions on this role attach here. CMS and other platform permissions do not.
			</p>
			<div className="grid gap-2 sm:grid-cols-2">
				<label className="flex items-center gap-3 rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px]">
					<input
						type="radio"
						name={`${name}-mode`}
						checked={value.mode === "org"}
						onChange={() => onChange({ ...value, mode: "org", orgTag: "" })}
					/>
					Organization
				</label>
				<label className="flex items-center gap-3 rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px]">
					<input
						type="radio"
						name={`${name}-mode`}
						checked={value.mode === "orgtag"}
						onChange={() => onChange({ ...value, mode: "orgtag", org: "" })}
					/>
					Organization tag
				</label>
			</div>
			{value.mode === "org" ? (
				<select
					value={value.org}
					onChange={(event) => onChange({ ...value, org: event.target.value, orgTag: "" })}
					className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
				>
					<option value="">Choose an organization</option>
					{organizations.map((org) => (
						<option key={org.id} value={org.slug}>
							{org.name}
						</option>
					))}
				</select>
			) : (
				<select
					value={value.orgTag}
					onChange={(event) => onChange({ ...value, orgTag: event.target.value, org: "" })}
					className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
				>
					<option value="">Choose an organization tag</option>
					{orgTags.map((tag) => (
						<option key={tag} value={tag}>
							{tag}
						</option>
					))}
				</select>
			)}
			{value.mode === "orgtag" && orgTags.length === 0 ? (
				<p className="text-[12px] text-[#8C8C8C]">No organization tags yet.</p>
			) : null}
		</div>
	)
}
