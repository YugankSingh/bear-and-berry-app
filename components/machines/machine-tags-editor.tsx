"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

type MachineTagsEditorProps = {
	machineId: string
	tags: string[]
	canEdit: boolean
}

export function MachineTagsEditor({ machineId, tags, canEdit }: MachineTagsEditorProps) {
	const router = useRouter()
	const [value, setValue] = useState(tags.join(", "))
	const [editing, setEditing] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")
		const nextTags = value
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0)

		const response = await fetch(`/apis/machines/${machineId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tags: nextTags }),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)

		if (!payload.ok) {
			setError(payload.error ?? "Could not save tags.")
			return
		}

		setEditing(false)
		router.refresh()
	}

	if (!canEdit) {
		return (
			<div className="flex flex-wrap gap-1.5">
				{tags.length === 0 ? <span className="text-[12px] text-[#8C8C8C]">No tags</span> : null}
				{tags.map((tag) => (
					<span
						key={tag}
						className="rounded-full border border-[#ECEAE6] bg-[#F8F6F2] px-2.5 py-1 text-[11px] text-[#555555]"
					>
						{tag}
					</span>
				))}
			</div>
		)
	}

	if (!editing) {
		return (
			<button type="button" onClick={() => setEditing(true)} className="text-left">
				<div className="flex flex-wrap gap-1.5">
					{tags.length === 0 ? <span className="text-[12px] text-[#8C8C8C]">Add tags</span> : null}
					{tags.map((tag) => (
						<span
							key={tag}
							className="rounded-full border border-[#ECEAE6] bg-[#F8F6F2] px-2.5 py-1 text-[11px] text-[#555555]"
						>
							{tag}
						</span>
					))}
				</div>
			</button>
		)
	}

	return (
		<form onSubmit={(event) => void onSubmit(event)} className="space-y-2">
			<input
				value={value}
				onChange={(event) => setValue(event.target.value)}
				placeholder="pilot, gen1, north"
				className="w-full min-w-[160px] rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-3 py-2 text-[13px] outline-none"
			/>
			{error ? <p className="text-[12px] text-[#BD0C16]">{error}</p> : null}
			<div className="flex gap-2">
				<button
					type="submit"
					disabled={loading}
					className="rounded-full bg-[#BD0C16] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
				>
					{loading ? "Saving…" : "Save"}
				</button>
				<button
					type="button"
					onClick={() => {
						setEditing(false)
						setValue(tags.join(", "))
					}}
					className="text-[11px] text-[#8C8C8C]"
				>
					Cancel
				</button>
			</div>
		</form>
	)
}
