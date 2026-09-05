"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ROLES, type Role } from "@/types/domain"

const INVITE_ROLES: Role[] = ["admin", "operator", "viewer"]

export function InviteUserForm() {
	const router = useRouter()
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [role, setRole] = useState<Role>("operator")
	const [organization, setOrganization] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")

		const response = await fetch("/apis/users", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name,
				email,
				password,
				role,
				organization: organization || undefined,
			}),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)

		if (!payload.ok) {
			setError(payload.error ?? "Could not create user.")
			return
		}

		setName("")
		setEmail("")
		setPassword("")
		setOrganization("")
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
			<input
				required
				type="password"
				minLength={8}
				value={password}
				onChange={(event) => setPassword(event.target.value)}
				placeholder="Temporary password"
				className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
			/>
			<select
				value={role}
				onChange={(event) => setRole(event.target.value as Role)}
				className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
			>
				{INVITE_ROLES.filter((item) => ROLES.includes(item)).map((item) => (
					<option key={item} value={item}>
						{item.replaceAll("_", " ")}
					</option>
				))}
			</select>
			<input
				value={organization}
				onChange={(event) => setOrganization(event.target.value)}
				placeholder="Organization (optional)"
				className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none md:col-span-2"
			/>
			{error ? <p className="text-[13px] text-[#BD0C16] md:col-span-2">{error}</p> : null}
			<button
				type="submit"
				disabled={loading}
				className="rounded-full bg-[#BD0C16] px-6 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50 md:col-span-2"
			>
				{loading ? "Inviting…" : "Create account"}
			</button>
		</form>
	)
}
