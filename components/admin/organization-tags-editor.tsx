"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TagPicker } from "@/components/admin/tag-picker"

type OrganizationTagsEditorProps = {
	orgSlug: string
	tags: string[]
	canEdit: boolean
	/** Every tag in the catalog, offered in the picker. */
	catalog: string[]
}

type TagResponse = { ok: boolean; error?: string; data?: { organization?: { tags: string[] } } }

export function OrganizationTagsEditor({ orgSlug, tags, canEdit, catalog }: OrganizationTagsEditorProps) {
	const router = useRouter()
	const [current, setCurrent] = useState(tags)
	const [syncedTags, setSyncedTags] = useState(tags)
	const [adding, setAdding] = useState(false)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState("")

	if (tags !== syncedTags) {
		setSyncedTags(tags)
		setCurrent(tags)
	}

	async function apply(response: Response, fallback: string): Promise<boolean> {
		const payload = (await response.json()) as TagResponse
		if (!payload.ok) {
			setError(payload.error ?? fallback)
			return false
		}
		if (payload.data?.organization) {
			setCurrent(payload.data.organization.tags)
		}
		router.refresh()
		return true
	}

	async function addTag(tag: string, isNew: boolean) {
		setBusy(true)
		setError("")
		const response = await fetch(`/apis/organizations/${orgSlug}/tags`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tag, create: isNew }),
		})
		const saved = await apply(response, "Could not add tag.")
		setBusy(false)
		if (saved) {
			setAdding(false)
		}
	}

	async function removeTag(tag: string) {
		if (
			!window.confirm(
				`Remove "${tag}" from ${orgSlug}? Anyone who gets access to this organization through the "${tag}" tag will lose it.`,
			)
		) {
			return
		}
		setBusy(true)
		setError("")
		const response = await fetch(`/apis/organizations/${orgSlug}/tags/${encodeURIComponent(tag)}`, {
			method: "DELETE",
		})
		await apply(response, "Could not remove tag.")
		setBusy(false)
	}

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-1.5">
				{current.length === 0 && !canEdit ? <span className="text-[12px] text-[#8C8C8C]">No tags</span> : null}
				{current.map((tag) => (
					<span
						key={tag}
						className="inline-flex items-center gap-1 rounded-full border border-[#ECEAE6] bg-[#F8F6F2] py-1 pl-2.5 pr-1.5 text-[11px] text-[#555555]"
					>
						{tag}
						{canEdit ? (
							<button
								type="button"
								disabled={busy}
								onClick={() => void removeTag(tag)}
								aria-label={`Remove tag ${tag}`}
								className="flex h-4 w-4 items-center justify-center rounded-full text-[#8C8C8C] hover:bg-[#BD0C16]/10 hover:text-[#BD0C16] disabled:opacity-50"
							>
								×
							</button>
						) : null}
					</span>
				))}
				{canEdit && !adding ? (
					<button
						type="button"
						onClick={() => setAdding(true)}
						className="rounded-full border border-dashed border-[#BD0C16]/40 px-2.5 py-1 text-[11px] font-medium text-[#BD0C16] hover:bg-[#BD0C16]/5"
					>
						+ Add tag
					</button>
				) : null}
			</div>

			{canEdit && adding ? (
				<TagPicker
					catalog={catalog}
					exclude={current}
					busy={busy}
					onSubmit={addTag}
					onCancel={() => {
						setAdding(false)
						setError("")
					}}
				/>
			) : null}

			{error ? <p className="text-[12px] text-[#BD0C16]">{error}</p> : null}
		</div>
	)
}
