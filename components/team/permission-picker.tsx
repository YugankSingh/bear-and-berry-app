"use client"

import { useMemo } from "react"
import { PERMISSION_GROUP_LABELS } from "@/lib/auth/permissions"
import type { Permission, PermissionRecord } from "@/types/domain"

type PermissionPickerProps = {
	catalog: PermissionRecord[]
	grantable: Permission[]
	value: Permission[]
	onChange: (value: Permission[]) => void
}

function toggle(list: Permission[], key: Permission): Permission[] {
	return list.includes(key) ? list.filter((item) => item !== key) : [...list, key]
}

export function PermissionPicker({ catalog, grantable, value, onChange }: PermissionPickerProps) {
	const grouped = useMemo(() => {
		const groups = new Map<string, PermissionRecord[]>()
		for (const item of catalog) {
			if (!grantable.includes(item.key)) {
				continue
			}
			const list = groups.get(item.group) ?? []
			list.push(item)
			groups.set(item.group, list)
		}
		return [...groups.entries()]
	}, [catalog, grantable])

	const cmsOnly = grantable.filter((key) => key === "cms:read" || key === "cms:write")

	function setGroup(items: PermissionRecord[], checked: boolean) {
		const keys = items.map((item) => item.key)
		if (checked) {
			onChange([...new Set([...value, ...keys])])
			return
		}
		onChange(value.filter((key) => !keys.includes(key)))
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-[13px] text-[#8C8C8C]">
					{value.length === 0
						? "No permissions selected yet."
						: `${value.length} permission${value.length === 1 ? "" : "s"} selected.`}
				</p>
				<div className="flex flex-wrap gap-2">
					{cmsOnly.length > 0 ? (
						<button
							type="button"
							onClick={() => onChange(cmsOnly)}
							className="rounded-full border border-[#ECEAE6] px-3 py-1.5 text-[12px] text-[#1A1A1A] hover:bg-white"
						>
							CMS only
						</button>
					) : null}
					<button
						type="button"
						onClick={() => onChange([])}
						className="rounded-full border border-[#ECEAE6] px-3 py-1.5 text-[12px] text-[#8C8C8C] hover:bg-white"
					>
						Clear
					</button>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				{grouped.map(([group, items]) => {
					const selectedCount = items.filter((item) => value.includes(item.key)).length
					const allSelected = selectedCount === items.length
					return (
						<section key={group} className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] p-4">
							<div className="mb-3 flex items-center justify-between gap-3">
								<p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#8C8C8C]">
									{PERMISSION_GROUP_LABELS[group] ?? group}
								</p>
								<button
									type="button"
									onClick={() => setGroup(items, !allSelected)}
									className="text-[11px] text-[#1A1A1A]/55 hover:text-[#1A1A1A]"
								>
									{allSelected ? "Clear group" : "Select group"}
								</button>
							</div>
							{items.map((item) => (
								<label key={item.key} className="mt-2 flex items-start gap-3 text-[13px] text-[#1A1A1A]">
									<input
										type="checkbox"
										checked={value.includes(item.key)}
										onChange={() => onChange(toggle(value, item.key))}
										className="mt-0.5"
									/>
									<span>
										{item.name}
										<span className="mt-0.5 block text-[11px] text-[#8C8C8C]">{item.key}</span>
									</span>
								</label>
							))}
						</section>
					)
				})}
			</div>
		</div>
	)
}
