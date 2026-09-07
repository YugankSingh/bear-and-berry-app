"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type {
	LocationRecord,
	MachineRecord,
	OrganizationRecord,
	Permission,
	PermissionRecord,
	RoleRecord,
	UserRecord,
} from "@/types/domain"
import {
	MembershipFields,
	emptyMembershipFields,
	type MembershipFieldsValue,
} from "@/components/team/membership-fields"
import { ExtraGrantBuilder } from "@/components/team/extra-grant-builder"
import { extraGrantsRequest, membershipRequest } from "@/lib/auth/assignment"
import { draftFromGrant, type ExtraGrantDraft } from "@/lib/auth/extra-grants"
import { GRANT_WILDCARD } from "@/lib/auth/grants"

type UserPermissionsButtonProps = {
	user: UserRecord
	catalog: PermissionRecord[]
	grantable: Permission[]
	assignableRoles: RoleRecord[]
	organizations: OrganizationRecord[]
	locations: LocationRecord[]
	machines: MachineRecord[]
	canEditMembership: boolean
	canGrantExtras: boolean
	allowOrgWildcard?: boolean
}

function membershipFromUser(user: UserRecord, organizations: OrganizationRecord[]): MembershipFieldsValue {
	const membership = user.memberships[0]
	if (membership?.orgTag) {
		return { mode: "orgtag", org: "", orgTag: membership.orgTag }
	}
	if (membership?.org && membership.org !== GRANT_WILDCARD) {
		return { mode: "org", org: membership.org, orgTag: "" }
	}
	return emptyMembershipFields(organizations)
}

function extrasFromUser(user: UserRecord): ExtraGrantDraft[] {
	return user.extraGrants.map((grant, index) => draftFromGrant(grant, `existing-${index}`))
}

export function UserPermissionsButton({
	user,
	catalog,
	grantable,
	assignableRoles,
	organizations,
	locations,
	machines,
	canEditMembership,
	canGrantExtras,
	allowOrgWildcard = false,
}: UserPermissionsButtonProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [roleSlug, setRoleSlug] = useState(user.role)
	const selectedRole =
		assignableRoles.find((role) => role.slug === roleSlug) ??
		assignableRoles.find((role) => role.slug === user.role) ??
		assignableRoles[0]
	const [membership, setMembership] = useState<MembershipFieldsValue>(membershipFromUser(user, organizations))
	const [extras, setExtras] = useState<ExtraGrantDraft[]>(extrasFromUser(user))
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	function reset() {
		setRoleSlug(user.role)
		setMembership(membershipFromUser(user, organizations))
		setExtras(extrasFromUser(user))
		setError("")
	}

	async function save() {
		if (!selectedRole) {
			setError("Choose a role.")
			return
		}
		const membershipBody = membershipRequest(selectedRole, membership)
		if (typeof membershipBody === "string") {
			setError(membershipBody)
			return
		}
		const extraGrants = extraGrantsRequest(extras)
		if (typeof extraGrants === "string") {
			setError(extraGrants)
			return
		}

		setLoading(true)
		setError("")
		const response = await fetch(`/apis/users/${user.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				role: canEditMembership ? selectedRole.slug : undefined,
				membership: canEditMembership ? membershipBody : undefined,
				extraGrants: canGrantExtras ? extraGrants : undefined,
			}),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not update permissions.")
			return
		}
		setOpen(false)
		router.refresh()
	}

	if (!open) {
		return (
			<button
				type="button"
				onClick={() => {
					reset()
					setOpen(true)
				}}
				className="rounded-full border border-[#ECEAE6] px-4 py-2 text-[12px] text-[#1A1A1A] hover:bg-white"
			>
				Permissions
			</button>
		)
	}

	return (
		<div className="min-w-[280px] max-w-[420px] space-y-3 rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] p-4">
			<p className="text-[12px] text-[#8C8C8C]">
				Role permissions stay with the role. Extra grants are specific to {user.name}.
			</p>
			{canEditMembership ? (
				<select
					value={roleSlug}
					onChange={(event) => {
						setRoleSlug(event.target.value)
						setMembership(emptyMembershipFields(organizations))
					}}
					className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-3 py-2 text-[13px] outline-none"
				>
					{assignableRoles.map((item) => (
						<option key={item.slug} value={item.slug}>
							{item.name}
						</option>
					))}
				</select>
			) : (
				<p className="text-[13px] text-[#1A1A1A]">{user.roleName}</p>
			)}
			{canEditMembership ? (
				<MembershipFields
					name={`edit-membership-${user.id}`}
					role={selectedRole}
					value={membership}
					onChange={setMembership}
					organizations={organizations}
				/>
			) : null}
			{canGrantExtras ? (
				<ExtraGrantBuilder
					drafts={extras}
					onChange={setExtras}
					grantable={grantable}
					catalog={catalog}
					organizations={organizations}
					locations={locations}
					machines={machines}
					allowOrgWildcard={allowOrgWildcard}
				/>
			) : null}
			{error ? <p className="text-[12px] text-[#BD0C16]">{error}</p> : null}
			<div className="flex gap-2">
				<button
					type="button"
					disabled={loading}
					onClick={() => void save()}
					className="rounded-full bg-[#BD0C16] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50"
				>
					{loading ? "Saving…" : "Save"}
				</button>
				<button
					type="button"
					onClick={() => setOpen(false)}
					className="rounded-full px-4 py-2 text-[12px] text-[#8C8C8C]"
				>
					Cancel
				</button>
			</div>
		</div>
	)
}
