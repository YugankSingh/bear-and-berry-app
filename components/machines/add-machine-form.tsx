"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { MACHINE_MODELS, type LocationRecord, type MachineModel } from "@/types/domain"

type AddMachineFormProps = {
	orgSlug: string
	locations: Pick<LocationRecord, "id" | "name" | "city">[]
}

const FIELD = "rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"

export function AddMachineForm({ orgSlug, locations }: AddMachineFormProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [name, setName] = useState("")
	const [serialNumber, setSerialNumber] = useState("")
	const [model, setModel] = useState<MachineModel>(MACHINE_MODELS[0])
	const [locationId, setLocationId] = useState("")
	const [tags, setTags] = useState("")
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	function reset() {
		setName("")
		setSerialNumber("")
		setModel(MACHINE_MODELS[0])
		setLocationId("")
		setTags("")
		setError("")
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")
		const response = await fetch("/apis/machines", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: name.trim(),
				serialNumber: serialNumber.trim(),
				model,
				orgSlug,
				locationId: locationId || null,
				tags: tags
					.split(",")
					.map((tag) => tag.trim())
					.filter((tag) => tag.length > 0),
			}),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not add the machine.")
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
				+ Add machine
			</button>
		)
	}

	return (
		<form
			onSubmit={(event) => void onSubmit(event)}
			className="grid gap-3 rounded-3xl bg-white p-6 card-shadow md:grid-cols-2"
		>
			<p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
				Add a machine to {orgSlug}
			</p>
			<input
				required
				minLength={2}
				value={name}
				onChange={(event) => setName(event.target.value)}
				placeholder="Machine name (e.g. Lobby BB-01)"
				className={FIELD}
			/>
			<input
				required
				minLength={3}
				value={serialNumber}
				onChange={(event) => setSerialNumber(event.target.value)}
				placeholder="Serial number"
				className={FIELD}
			/>
			<select value={model} onChange={(event) => setModel(event.target.value as MachineModel)} className={FIELD}>
				{MACHINE_MODELS.map((item) => (
					<option key={item} value={item}>
						{item}
					</option>
				))}
			</select>
			<select value={locationId} onChange={(event) => setLocationId(event.target.value)} className={FIELD}>
				<option value="">No location yet</option>
				{locations.map((location) => (
					<option key={location.id} value={location.id}>
						{location.name} · {location.city}
					</option>
				))}
			</select>
			<input
				value={tags}
				onChange={(event) => setTags(event.target.value)}
				placeholder="Tags, comma separated (optional)"
				className={`${FIELD} md:col-span-2`}
			/>
			{locations.length === 0 ? (
				<p className="md:col-span-2 text-[12px] text-[#8C8C8C]">
					No locations in this organization yet. Add one on the Locations page, or assign it later.
				</p>
			) : null}
			{error ? <p className="md:col-span-2 text-[13px] text-[#BD0C16]">{error}</p> : null}
			<div className="md:col-span-2 flex gap-2">
				<button
					type="submit"
					disabled={loading}
					className="rounded-full bg-[#BD0C16] px-6 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50"
				>
					{loading ? "Adding…" : "Add machine"}
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
