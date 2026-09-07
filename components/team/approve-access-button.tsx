"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { LocationRecord, MachineRecord, OrganizationRecord, Permission, PermissionRecord, RoleRecord } from "@/types/domain"
import {
	MembershipFields,
	emptyMembershipFields,
	type MembershipFieldsValue,
} from "@/components/team/membership-fields"
import { ExtraGrantBuilder } from "@/components/team/extra-grant-builder"
import { extraGrantsRequest, membershipRequest } from "@/lib/auth/assignment"
import type { ExtraGrantDraft } from "@/lib/auth/extra-grants"

type ApproveAccessButtonProps = {
	userId: string
	assignableRoles: RoleRecord[]
	organizations: OrganizationRecord[]
	locations: LocationRecord[]
	machines: MachineRecord[]
	catalog: PermissionRecord[]
	grantable: Permission[]
	canGrantExtras: boolean
	allowOrgWildcard?: boolean
}

export function ApproveAccessButton({
	userId,
	assignableRoles,
	organizations,
	locations,
	machines,
	catalog,
	grantable,
	canGrantExtras,
	allowOrgWildcard = false,
}: ApproveAccessButtonProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [roleSlug, setRoleSlug] = useState(assignableRoles[0]?.slug ?? "")
	const selectedRole = assignableRoles.find((role) => role.slug === roleSlug) ?? assignableRoles[0]
	const [membership, setMembership] = useState<MembershipFieldsValue>(emptyMembershipFields(organizations))
	const [extras, setExtras] = useState<ExtraGrantDraft[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	async function approve() {
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
		const response = await fetch(`/apis/users/${userId}/invite`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				role: selectedRole.slug,
				membership: membershipBody,
				extraGrants: canGrantExtras ? extraGrants : undefined,
			}),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)

		if (!payload.ok) {
			setError(payload.error ?? "Could not grant access.")
			return
		}

		router.refresh()
	}

	if (!open) {
		return (
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="rounded-full bg-[#BD0C16] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#a00a12]"
			>
				Invite
			</button>
		)
	}

	return (
		<div className="min-w-[280px] max-w-[420px] space-y-3 rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] p-4">
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
			<MembershipFields
				name={`approve-membership-${userId}`}
				role={selectedRole}
				value={membership}
				onChange={setMembership}
				organizations={organizations}
			/>
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
					onClick={() => void approve()}
					className="rounded-full bg-[#BD0C16] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50"
				>
					{loading ? "Sending…" : "Send invitation"}
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
