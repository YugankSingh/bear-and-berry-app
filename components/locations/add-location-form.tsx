"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { SITE_TYPES, type SiteType } from "@/types/domain"
import { titleCase } from "@/lib/format"

type AddLocationFormProps = {
	orgSlug: string
}

const FIELD = "rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-4 py-3 text-[14px] outline-none"

export function AddLocationForm({ orgSlug }: AddLocationFormProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [name, setName] = useState("")
	const [city, setCity] = useState("")
	const [region, setRegion] = useState("")
	const [address, setAddress] = useState("")
	const [siteType, setSiteType] = useState<SiteType>(SITE_TYPES[0])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")

	function reset() {
		setName("")
		setCity("")
		setRegion("")
		setAddress("")
		setSiteType(SITE_TYPES[0])
		setError("")
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")
		const response = await fetch("/apis/locations", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: name.trim(),
				city: city.trim(),
				region: region.trim(),
				address: address.trim() || undefined,
				siteType,
				orgSlug,
			}),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not add the location.")
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
				+ Add location
			</button>
		)
	}

	return (
		<form
			onSubmit={(event) => void onSubmit(event)}
			className="grid gap-3 rounded-3xl bg-white p-6 card-shadow md:grid-cols-2"
		>
			<p className="md:col-span-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
				Add a location to {orgSlug}
			</p>
			<input
				required
				minLength={2}
				value={name}
				onChange={(event) => setName(event.target.value)}
				placeholder="Site name (e.g. Phoenix Mall)"
				className={FIELD}
			/>
			<select value={siteType} onChange={(event) => setSiteType(event.target.value as SiteType)} className={FIELD}>
				{SITE_TYPES.map((item) => (
					<option key={item} value={item}>
						{titleCase(item)}
					</option>
				))}
			</select>
			<input
				required
				minLength={2}
				value={city}
				onChange={(event) => setCity(event.target.value)}
				placeholder="City"
				className={FIELD}
			/>
			<input
				required
				minLength={2}
				value={region}
				onChange={(event) => setRegion(event.target.value)}
				placeholder="State / region"
				className={FIELD}
			/>
			<input
				value={address}
				onChange={(event) => setAddress(event.target.value)}
				placeholder="Address (optional)"
				className={`${FIELD} md:col-span-2`}
			/>
			{error ? <p className="md:col-span-2 text-[13px] text-[#BD0C16]">{error}</p> : null}
			<div className="md:col-span-2 flex gap-2">
				<button
					type="submit"
					disabled={loading}
					className="rounded-full bg-[#BD0C16] px-6 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50"
				>
					{loading ? "Adding…" : "Add location"}
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
