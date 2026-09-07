"use client"

import { GRANT_WILDCARD } from "@/lib/auth/grants"
import {
	emptyExtraGrantDraft,
	extraGrantFromDraft,
	type ExtraGrantDraft,
} from "@/lib/auth/extra-grants"
import { isReservedPermission, PERMISSION_META } from "@/lib/auth/permissions"
import { isOrgBoundPermission, scopeForPermission } from "@/lib/auth/permission-scopes"
import type { LocationRecord, MachineRecord, OrganizationRecord, Permission, PermissionRecord } from "@/types/domain"

type ExtraGrantBuilderProps = {
	drafts: ExtraGrantDraft[]
	onChange: (drafts: ExtraGrantDraft[]) => void
	grantable: Permission[]
	catalog: PermissionRecord[]
	organizations: OrganizationRecord[]
	locations: LocationRecord[]
	machines: MachineRecord[]
	allowOrgWildcard?: boolean
}

function nextKey(drafts: ExtraGrantDraft[]): string {
	return `grant-${Date.now()}-${drafts.length}`
}

export function ExtraGrantBuilder({
	drafts,
	onChange,
	grantable,
	catalog,
	organizations,
	locations,
	machines,
	allowOrgWildcard = false,
}: ExtraGrantBuilderProps) {
	const options = catalog.filter(
		(item) => grantable.includes(item.key) && !isReservedPermission(item.key),
	)
	const orgTags = [...new Set(organizations.flatMap((org) => org.tags))].sort()

	function update(key: string, patch: Partial<ExtraGrantDraft>) {
		onChange(drafts.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)))
	}

	return (
		<div className="space-y-3 md:col-span-2">
			<div className="flex items-center justify-between gap-3">
				<p className="text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
					Extra permissions
				</p>
				<button
					type="button"
					onClick={() => onChange([...drafts, emptyExtraGrantDraft(nextKey(drafts))])}
					className="rounded-full border border-[#ECEAE6] px-4 py-2 text-[12px] text-[#1A1A1A] hover:bg-white"
				>
					Add a permission
				</button>
			</div>
			{drafts.length === 0 ? (
				<p className="text-[13px] leading-[1.6] text-[#8C8C8C]">
					Optional. Each extra permission starts from scratch and only shows the scopes it supports.
				</p>
			) : null}
			{drafts.map((draft) => {
				const spec = draft.permission ? scopeForPermission(draft.permission) : null
				const orgBound = draft.permission ? isOrgBoundPermission(draft.permission) : false
				const selectedOrgs =
					draft.scopeMode === "org" && draft.org && draft.org !== GRANT_WILDCARD
						? [draft.org]
						: draft.scopeMode === "orgtag" && draft.orgTag
							? organizations.filter((org) => org.tags.includes(draft.orgTag)).map((org) => org.slug)
							: []
				const visibleLocations =
					selectedOrgs.length > 0
						? locations.filter((location) => selectedOrgs.includes(location.orgSlug))
						: locations
				const visibleMachines =
					selectedOrgs.length > 0
						? machines.filter((machine) => selectedOrgs.includes(machine.orgSlug))
						: machines
				const parsed = draft.permission ? extraGrantFromDraft(draft) : null
				const error = typeof parsed === "string" ? parsed : null

				return (
					<div key={draft.key} className="space-y-3 rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] p-4">
						<div className="flex items-start justify-between gap-3">
							<select
								value={draft.permission}
								onChange={(event) =>
									update(draft.key, {
										permission: event.target.value as ExtraGrantDraft["permission"],
										scopeMode: "org",
										org: "",
										orgTag: "",
										location: "",
										tag: "",
										id: "",
									})
								}
								className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-3 py-2 text-[13px] outline-none"
							>
								<option value="">Choose a permission</option>
								{options.map((item) => (
									<option key={item.key} value={item.key}>
										{item.name}
									</option>
								))}
							</select>
							<button
								type="button"
								onClick={() => onChange(drafts.filter((item) => item.key !== draft.key))}
								className="shrink-0 rounded-full px-3 py-2 text-[12px] text-[#8C8C8C]"
							>
								Remove
							</button>
						</div>

						{orgBound && spec ? (
							<>
								<div className="grid gap-2 sm:grid-cols-2">
									<label className="flex items-center gap-2 text-[13px]">
										<input
											type="radio"
											name={`${draft.key}-scope`}
											checked={draft.scopeMode === "org"}
											onChange={() => update(draft.key, { scopeMode: "org", orgTag: "" })}
										/>
										Organization
									</label>
									<label className="flex items-center gap-2 text-[13px]">
										<input
											type="radio"
											name={`${draft.key}-scope`}
											checked={draft.scopeMode === "orgtag"}
											onChange={() => update(draft.key, { scopeMode: "orgtag", org: "" })}
										/>
										Organization tag
									</label>
								</div>
								{draft.scopeMode === "org" ? (
									<select
										value={draft.org}
										onChange={(event) => update(draft.key, { org: event.target.value })}
										className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-3 py-2 text-[13px] outline-none"
									>
										<option value="">Choose an organization</option>
										{allowOrgWildcard ? <option value={GRANT_WILDCARD}>All organizations</option> : null}
										{organizations.map((org) => (
											<option key={org.id} value={org.slug}>
												{org.name}
											</option>
										))}
									</select>
								) : (
									<select
										value={draft.orgTag}
										onChange={(event) => update(draft.key, { orgTag: event.target.value })}
										className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-3 py-2 text-[13px] outline-none"
									>
										<option value="">Choose an organization tag</option>
										{orgTags.map((tag) => (
											<option key={tag} value={tag}>
												{tag}
											</option>
										))}
									</select>
								)}
							</>
						) : null}

						{spec?.location && (!orgBound || selectedOrgs.length > 0 || draft.org === GRANT_WILDCARD) ? (
							<label className="block text-[12px] text-[#8C8C8C]">
								Location
								<select
									value={draft.location}
									onChange={(event) => update(draft.key, { location: event.target.value })}
									className="mt-2 w-full rounded-2xl border border-[#ECEAE6] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none"
								>
									<option value="">All locations</option>
									{visibleLocations.map((location) => (
										<option key={location.id} value={location.id}>
											{location.name}
										</option>
									))}
								</select>
							</label>
						) : null}

						{spec?.tag && (!orgBound || selectedOrgs.length > 0 || draft.org === GRANT_WILDCARD) ? (
							<label className="block text-[12px] text-[#8C8C8C]">
								{spec.tagLabel}
								<input
									value={draft.tag}
									onChange={(event) => update(draft.key, { tag: event.target.value })}
									placeholder={spec.binding === "none" ? "Leave blank for all blog tags" : "Leave blank for all tags"}
									className="mt-2 w-full rounded-2xl border border-[#ECEAE6] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none"
								/>
							</label>
						) : null}

						{spec?.id && (!orgBound || selectedOrgs.length > 0 || draft.org === GRANT_WILDCARD) ? (
							<label className="block text-[12px] text-[#8C8C8C]">
								Specific {draft.permission.startsWith("locations:") ? "location" : "machine"}
								<select
									value={draft.id}
									onChange={(event) => update(draft.key, { id: event.target.value })}
									className="mt-2 w-full rounded-2xl border border-[#ECEAE6] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none"
								>
									<option value="">Any</option>
									{(draft.permission.startsWith("locations:") ? visibleLocations : visibleMachines).map((item) => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
							</label>
						) : null}

						{draft.permission && !orgBound && spec && !spec.tag ? (
							<p className="text-[12px] text-[#8C8C8C]">
								{PERMISSION_META[draft.permission].name} is not tied to an organization.
							</p>
						) : null}
						{error && draft.permission ? <p className="text-[12px] text-[#BD0C16]">{error}</p> : null}
					</div>
				)
			})}
		</div>
	)
}
