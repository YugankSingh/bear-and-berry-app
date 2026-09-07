"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { isOwnerRole, isReservedPermission } from "@/lib/auth/permissions"
import { isOrgBoundPermission } from "@/lib/auth/permission-scopes"
import type { Permission, PermissionRecord, RoleRecord } from "@/types/domain"

type RolesEditorProps = {
	roles: RoleRecord[]
	catalog: PermissionRecord[]
}

export function RolesEditor({ roles, catalog }: RolesEditorProps) {
	const router = useRouter()
	const [selected, setSelected] = useState(roles[0]?.slug ?? "")
	const role = roles.find((item) => item.slug === selected) ?? roles[0]
	const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? [])
	const [name, setName] = useState(role?.name ?? "")
	const [description, setDescription] = useState(role?.description ?? "")
	const [rank, setRank] = useState(role?.rank ?? 10)
	const [newName, setNewName] = useState("")
	const [newSlug, setNewSlug] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	const grouped = useMemo(() => {
		const groups = new Map<string, PermissionRecord[]>()
		const owner = role ? isOwnerRole(role) : false
		for (const item of catalog) {
			if (isReservedPermission(item.key) && !owner) {
				continue
			}
			const list = groups.get(item.group) ?? []
			list.push(item)
			groups.set(item.group, list)
		}
		return [...groups.entries()]
	}, [catalog, role])

	function selectRole(slug: string) {
		const next = roles.find((item) => item.slug === slug)
		setSelected(slug)
		setPermissions(next?.permissions ?? [])
		setName(next?.name ?? "")
		setDescription(next?.description ?? "")
		setRank(next?.rank ?? 10)
		setError("")
	}

	async function save() {
		if (!role) {
			return
		}
		setLoading(true)
		setError("")
		const response = await fetch(`/apis/roles/${role.slug}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, description, rank, permissions }),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not update that role.")
			return
		}
		router.refresh()
	}

	async function create() {
		setLoading(true)
		setError("")
		const response = await fetch("/apis/roles", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				slug: newSlug,
				name: newName,
				rank: 20,
				permissions: [],
			}),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string; data?: { role?: RoleRecord } }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not create that role.")
			return
		}
		setNewName("")
		setNewSlug("")
		if (payload.data?.role?.slug) {
			setSelected(payload.data.role.slug)
		}
		router.refresh()
	}

	return (
		<section className="rounded-3xl bg-white p-6 card-shadow lg:col-span-2">
			<p className="mb-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">Roles</p>
			<p className="mb-6 text-[13px] leading-[1.6] text-[#8C8C8C]">
				Permissions live on roles in the database. Org-bound ones attach to an organization when you
				assign the role. Platform permissions such as CMS stay unbound.
			</p>
			<div className="grid gap-6 lg:grid-cols-[220px_1fr]">
				<div className="space-y-2">
					{roles.map((item) => (
						<button
							key={item.slug}
							type="button"
							onClick={() => selectRole(item.slug)}
							className={`w-full rounded-2xl px-4 py-3 text-left text-[13px] ${
								item.slug === selected ? "bg-[#1A1A1A] text-white" : "bg-[#F8F6F2] text-[#1A1A1A]"
							}`}
						>
							{item.name}
							<span className="mt-1 block text-[11px] opacity-60">rank {item.rank}</span>
						</button>
					))}
					<div className="space-y-2 pt-4">
						<input
							value={newName}
							onChange={(event) => setNewName(event.target.value)}
							placeholder="New role name"
							className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-3 py-2 text-[13px] outline-none"
						/>
						<input
							value={newSlug}
							onChange={(event) => setNewSlug(event.target.value)}
							placeholder="slug_like_this"
							className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-3 py-2 text-[13px] outline-none"
						/>
						<button
							type="button"
							disabled={loading || !newName || !newSlug}
							onClick={() => void create()}
							className="w-full rounded-full bg-[#BD0C16] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
						>
							Add role
						</button>
					</div>
				</div>
				{role ? (
					<div className="space-y-4">
						<input
							value={name}
							onChange={(event) => setName(event.target.value)}
							className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
						/>
						<textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							rows={2}
							className="w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"
						/>
						<label className="block text-[13px] text-[#8C8C8C]">
							Rank
							<input
								type="number"
								value={rank}
								onChange={(event) => setRank(Number(event.target.value))}
								className="mt-2 w-full rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] text-[#1A1A1A] outline-none"
							/>
						</label>
						<div className="grid gap-4 md:grid-cols-2">
							{grouped.map(([group, items]) => (
								<fieldset key={group} className="rounded-2xl border border-[#ECEAE6] p-4">
									<legend className="px-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#8C8C8C]">
										{group}
									</legend>
									{items.map((item) => {
										const reserved = isReservedPermission(item.key)
										return (
											<label key={item.key} className="mt-2 flex items-center gap-2 text-[13px]">
												<input
													type="checkbox"
													checked={permissions.includes(item.key) || reserved}
													disabled={reserved}
													onChange={() =>
														setPermissions((current) =>
															current.includes(item.key)
																? current.filter((key) => key !== item.key)
																: [...current, item.key],
														)
													}
												/>
												{item.name}
												<span className="ml-1 text-[11px] text-[#8C8C8C]">
													{reserved
														? " · super admin only"
														: isOrgBoundPermission(item.key)
															? " · tied to organization when assigned"
															: " · platform — not tied to an organization"}
												</span>
											</label>
										)
									})}
								</fieldset>
							))}
						</div>
						{error ? <p className="text-[13px] text-[#BD0C16]">{error}</p> : null}
						<button
							type="button"
							disabled={loading}
							onClick={() => void save()}
							className="rounded-full bg-[#BD0C16] px-6 py-3 text-[13px] font-medium text-white disabled:opacity-50"
						>
							{loading ? "Saving…" : "Save role"}
						</button>
					</div>
				) : null}
			</div>
		</section>
	)
}
