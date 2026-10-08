"use client"

import { useState } from "react"

const CREATE_NEW = "__create_new__"
const TAG_PATTERN = /^[a-zA-Z0-9_-]+$/

type TagPickerProps = {
	/** Every tag in the catalog. */
	catalog: string[]
	/** Tags to leave out of the dropdown (e.g. already applied). */
	exclude?: string[]
	busy?: boolean
	allowCreate?: boolean
	submitLabel?: string
	onSubmit: (tag: string, isNew: boolean) => void | Promise<void>
	onCancel?: () => void
}

export function TagPicker({
	catalog,
	exclude = [],
	busy = false,
	allowCreate = true,
	submitLabel = "Add",
	onSubmit,
	onCancel,
}: TagPickerProps) {
	const options = catalog.filter((tag) => !exclude.includes(tag))
	const [choice, setChoice] = useState("")
	const [draft, setDraft] = useState("")
	const [error, setError] = useState("")
	const creating = choice === CREATE_NEW

	async function submit() {
		setError("")
		if (!creating) {
			if (choice) {
				await onSubmit(choice, false)
				setChoice("")
			}
			return
		}
		const tag = draft.trim()
		if (!TAG_PATTERN.test(tag) || tag.length > 40) {
			setError("Use letters, numbers, hyphens, or underscores (max 40).")
			return
		}
		if (exclude.includes(tag)) {
			setError(`"${tag}" is already applied.`)
			return
		}
		await onSubmit(tag, !catalog.includes(tag))
		setDraft("")
		setChoice("")
	}

	const canSubmit = creating ? draft.trim().length > 0 : choice.length > 0

	return (
		<div className="space-y-1.5">
			<div className="flex flex-wrap items-center gap-2">
				<select
					value={choice}
					onChange={(event) => {
						setChoice(event.target.value)
						setError("")
					}}
					className="min-w-[160px] rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-3 py-1.5 text-[12px] outline-none"
				>
					<option value="">{options.length > 0 ? "Choose a tag…" : "No other tags yet"}</option>
					{options.map((tag) => (
						<option key={tag} value={tag}>
							{tag}
						</option>
					))}
					{allowCreate ? <option value={CREATE_NEW}>+ Create new tag…</option> : null}
				</select>
				{creating ? (
					<input
						autoFocus
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault()
								void submit()
							}
						}}
						placeholder="new-tag-name"
						maxLength={40}
						className="w-[150px] rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-3 py-1.5 font-mono text-[12px] outline-none"
					/>
				) : null}
				<button
					type="button"
					onClick={() => void submit()}
					disabled={busy || !canSubmit}
					className="rounded-full bg-[#BD0C16] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
				>
					{busy ? "Saving…" : creating ? `Create & ${submitLabel.toLowerCase()}` : submitLabel}
				</button>
				{onCancel ? (
					<button type="button" onClick={onCancel} className="text-[11px] text-[#8C8C8C]">
						Cancel
					</button>
				) : null}
			</div>
			{error ? <p className="text-[11px] text-[#BD0C16]">{error}</p> : null}
		</div>
	)
}
