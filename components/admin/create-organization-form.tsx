"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ORG_KINDS, type OrgKind } from "@/types/domain"
import { titleCase } from "@/lib/format"
import { TagPicker } from "@/components/admin/tag-picker"

const FIELD = "rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60)
}

/** Lenient while typing so hyphens can be entered; the server validates the final slug. */
function sanitizeSlugInput(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^-+/, "")
		.slice(0, 60)
}

export function CreateOrganizationForm({ catalog }: { catalog: string[] }) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [name, setName] = useState("")
	const [slug, setSlug] = useState("")
	const [slugEdited, setSlugEdited] = useState(false)
	const [kind, setKind] = useState<OrgKind>("partner")
	const [tags, setTags] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	function reset() {
		setName("")
		setSlug("")
		setSlugEdited(false)
		setKind("partner")
		setTags([])
		setError("")
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")
		const response = await fetch("/apis/organizations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: name.trim(),
				slug: slug.replace(/-+$/, ""),
				kind,
				tags,
			}),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not create the organization.")
			return
		}
		reset()
		setOpen(false)
		router.refresh()
	}

	if (!open) {
		return (
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="rounded-full bg-[#BD0C16] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#a00a12]"
			>
				+ Create organization
			</button>
		)
	}

	return (
		<form
			onSubmit={(event) => void onSubmit(event)}
			className="grid gap-3 rounded-3xl bg-white p-6 card-shadow md:grid-cols-2"
		>
			<p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
				Create an organization
			</p>
			<input
				required
				minLength={2}
				value={name}
				onChange={(event) => {
					setName(event.target.value)
					if (!slugEdited) {
						setSlug(slugify(event.target.value))
					}
				}}
				placeholder="Organization name (e.g. Phoenix Malls)"
				className={FIELD}
			/>
			<div className="flex flex-col gap-1">
				<input
					required
					minLength={2}
					value={slug}
					onChange={(event) => {
						setSlugEdited(true)
						setSlug(sanitizeSlugInput(event.target.value))
					}}
					placeholder="url-slug"
					className={`${FIELD} font-mono`}
				/>
				<span className="px-2 text-[11px] text-[#8C8C8C]">
					/organization/{slug || "url-slug"} — can&apos;t be changed later
				</span>
			</div>
			<select value={kind} onChange={(event) => setKind(event.target.value as OrgKind)} className={FIELD}>
				{ORG_KINDS.map((item) => (
					<option key={item} value={item}>
						{titleCase(item)}
					</option>
				))}
			</select>
			<div className="space-y-2 md:col-span-2">
				<p className="text-[12px] text-[#8C8C8C]">Tags (optional)</p>
				{tags.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{tags.map((tag) => (
							<span
								key={tag}
								className="inline-flex items-center gap-1 rounded-full border border-[#ECEAE6] bg-[#F8F6F2] py-1 pl-2.5 pr-1.5 text-[11px] text-[#555555]"
							>
								{tag}
								{catalog.includes(tag) ? null : <span className="text-[#BD0C16]">new</span>}
								<button
									type="button"
									onClick={() => setTags(tags.filter((item) => item !== tag))}
									aria-label={`Remove tag ${tag}`}
									className="flex h-4 w-4 items-center justify-center rounded-full text-[#8C8C8C] hover:bg-[#BD0C16]/10 hover:text-[#BD0C16]"
								>
									×
								</button>
							</span>
						))}
					</div>
				) : null}
				<TagPicker catalog={catalog} exclude={tags} onSubmit={(tag) => setTags([...tags, tag])} />
			</div>
			{error ? <p className="md:col-span-2 text-[13px] text-[#BD0C16]">{error}</p> : null}
			<div className="md:col-span-2 flex gap-2">
				<button
					type="submit"
					disabled={loading}
					className="rounded-full bg-[#BD0C16] px-6 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50"
				>
					{loading ? "Creating…" : "Create organization"}
				</button>
				<button
					type="button"
					onClick={() => {
						reset()
						setOpen(false)
					}}
					className="rounded-full px-5 py-3 text-[13px] text-[#8C8C8C]"
				>
					Cancel
				</button>
			</div>
		</form>
	)
}
