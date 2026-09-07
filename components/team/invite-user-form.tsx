"use client"

import { useState, type FormEvent } from "react"
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

type InviteUserFormProps = {
	assignableRoles: RoleRecord[]
	organizations: OrganizationRecord[]
	locations: LocationRecord[]
	machines: MachineRecord[]
	catalog: PermissionRecord[]
	grantable: Permission[]
	canGrantExtras: boolean
	allowOrgWildcard?: boolean
}

export function InviteUserForm({
	assignableRoles,
	organizations,
	locations,
	machines,
	catalog,
	grantable,
	canGrantExtras,
	allowOrgWildcard = false,
}: InviteUserFormProps) {
	const router = useRouter()
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [roleSlug, setRoleSlug] = useState(assignableRoles[0]?.slug ?? "")
	const selectedRole = assignableRoles.find((role) => role.slug === roleSlug) ?? assignableRoles[0]
	const [membership, setMembership] = useState<MembershipFieldsValue>(emptyMembershipFields(organizations))
	const [extras, setExtras] = useState<ExtraGrantDraft[]>([])
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")

		if (!selectedRole) {
			setLoading(false)
			setError("Choose a role.")
			return
		}

		const membershipBody = membershipRequest(selectedRole, membership)
		if (typeof membershipBody === "string") {
			setLoading(false)
			setError(membershipBody)
			return
		}

		const extraGrants = extraGrantsRequest(extras)
		if (typeof extraGrants === "string") {
			setLoading(false)
			setError(extraGrants)
			return
		}

		const response = await fetch("/apis/users", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				email,
				role: selectedRole.slug,
				membership: membershipBody,
				extraGrants: canGrantExtras ? extraGrants : [],
			}),
		})
		const payload = (await response.json()) as {
			ok: boolean
			error?: string
			data?: { inviteSent?: boolean }
		}
		setLoading(false)

		if (!payload.ok) {
			setError(payload.error ?? "Could not send the invitation.")
			return
		}
		if (payload.data?.inviteSent === false) {
			setError("Invitation saved, but email was not sent. Check SMTP settings.")
		}

		setName("")
		setEmail("")
		setMembership(emptyMembershipFields(organizations))
		setExtras([])
		router.refresh()
	}

	return (
		<form
			onSubmit={(event) => void onSubmit(event)}
			className="grid gap-3 rounded-3xl bg-white p-6 card-shadow md:grid-cols-2"
		>
			<p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
				Invite a teammate
			</p>
			<input
				required
				value={name}
				onChange={(event) => setName(event.target.value)}
				placeholder="Full name"
				className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
			/>
			<input
				required
				type="email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				placeholder="Email"
				className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
			/>
			<select
				value={roleSlug}
				onChange={(event) => {
					setRoleSlug(event.target.value)
					setMembership(emptyMembershipFields(organizations))
				}}
				className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none md:col-span-2"
			>
				{assignableRoles.map((item) => (
					<option key={item.slug} value={item.slug}>
						{item.name}
					</option>
				))}
			</select>
			<MembershipFields
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
			{error ? <p className="text-[13px] text-[#BD0C16] md:col-span-2">{error}</p> : null}
			<button
				type="submit"
				disabled={loading}
				className="rounded-full bg-[#BD0C16] px-6 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50 md:col-span-2"
			>
				{loading ? "Sending invite…" : "Send invitation"}
			</button>
		</form>
	)
}
