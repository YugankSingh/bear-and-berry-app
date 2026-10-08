"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type PairingPayload = {
	code: string
	expiresAt: string
	ttlMs: number
	machine: { id: string; name: string; serialNumber: string }
}

type OpsCreds = {
	opsUsername: string
	opsPassword: string
	sshHost: string | null
	sshCommand: string
	installState: string
}

type MachineDevicePanelProps = {
	machineId: string
	machineName: string
	installState: string
	opsUsername: string | null
	sshHost: string | null
	hasOpsPassword: boolean
	canPair: boolean
}

function formatRemaining(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000))
	const minutes = Math.floor(total / 60)
	const seconds = total % 60
	return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function MachineDevicePanel({
	machineId,
	machineName,
	installState,
	opsUsername,
	sshHost,
	hasOpsPassword,
	canPair,
}: MachineDevicePanelProps) {
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")
	const [pairing, setPairing] = useState<PairingPayload | null>(null)
	const [creds, setCreds] = useState<OpsCreds | null>(null)
	const [hostDraft, setHostDraft] = useState(sshHost ?? "")
	const [now, setNow] = useState(() => Date.now())
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		setHostDraft(sshHost ?? "")
	}, [sshHost])

	useEffect(() => {
		if (!pairing) {
			return
		}
		const timer = window.setInterval(() => setNow(Date.now()), 1000)
		return () => window.clearInterval(timer)
	}, [pairing])

	const remainingMs = useMemo(() => {
		if (!pairing) {
			return 0
		}
		return new Date(pairing.expiresAt).getTime() - now
	}, [pairing, now])

	useEffect(() => {
		if (pairing && remainingMs <= 0) {
			setPairing(null)
		}
	}, [pairing, remainingMs])

	async function generateCode() {
		setLoading(true)
		setError("")
		setCreds(null)
		const response = await fetch(`/apis/machines/${machineId}/pairing-code`, { method: "POST" })
		const payload = (await response.json()) as {
			ok: boolean
			error?: string
			data?: PairingPayload
		}
		setLoading(false)
		if (!payload.ok || !payload.data) {
			setError(payload.error ?? "Could not generate pairing code.")
			return
		}
		setPairing(payload.data)
		setNow(Date.now())
		router.refresh()
	}

	async function revealCreds() {
		setLoading(true)
		setError("")
		const response = await fetch(`/apis/machines/${machineId}/ops-credentials`, { method: "POST" })
		const payload = (await response.json()) as {
			ok: boolean
			error?: string
			data?: OpsCreds
		}
		setLoading(false)
		if (!payload.ok || !payload.data) {
			setError(payload.error ?? "Could not reveal credentials.")
			return
		}
		setCreds(payload.data)
	}

	async function saveHost() {
		setLoading(true)
		setError("")
		const response = await fetch(`/apis/machines/${machineId}/ssh-host`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sshHost: hostDraft.trim() || null }),
		})
		const payload = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!payload.ok) {
			setError(payload.error ?? "Could not save SSH host.")
			return
		}
		router.refresh()
	}

	async function copyCommand(command: string) {
		await navigator.clipboard.writeText(command)
		setCopied(true)
		window.setTimeout(() => setCopied(false), 1500)
	}

	if (!canPair) {
		return (
			<div className="space-y-1 text-[12px] text-[#8C8C8C]">
				<p className="uppercase tracking-[1px]">{installState.replaceAll("_", " ")}</p>
				{opsUsername ? <p className="font-mono text-[11px]">{opsUsername}</p> : null}
			</div>
		)
	}

	const sshCommand =
		creds?.sshCommand ??
		(opsUsername && sshHost ? `ssh ${opsUsername}@${sshHost}` : opsUsername ? `ssh ${opsUsername}@<ssh-host>` : null)

	return (
		<div className="min-w-[200px] space-y-2 text-left">
			<p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#8C8C8C]">
				{installState.replaceAll("_", " ")}
			</p>

			{pairing && remainingMs > 0 ? (
				<div className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-3 py-2">
					<p className="font-mono text-[18px] font-semibold tracking-[0.2em] text-[#1A1A1A]">
						{pairing.code}
					</p>
					<p className="mt-1 text-[11px] text-[#8C8C8C]">
						{machineName} · expires {formatRemaining(remainingMs)}
					</p>
				</div>
			) : (
				<button
					type="button"
					onClick={() => void generateCode()}
					disabled={loading}
					className="rounded-full border border-[#ECEAE6] bg-white px-3 py-1.5 text-[11px] font-medium text-[#1A1A1A] disabled:opacity-50"
				>
					{loading ? "Working…" : "Pairing code"}
				</button>
			)}

			{hasOpsPassword ? (
				<div className="space-y-1.5">
					{opsUsername ? (
						<p className="font-mono text-[12px] text-[#555555]">{opsUsername}</p>
					) : null}
					<div className="flex gap-1">
						<input
							value={hostDraft}
							onChange={(event) => setHostDraft(event.target.value)}
							placeholder="10.10.0.12 (WG IP)"
							className="w-full min-w-[120px] rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-2.5 py-1.5 text-[12px] outline-none"
						/>
						<button
							type="button"
							onClick={() => void saveHost()}
							disabled={loading}
							className="rounded-full border border-[#ECEAE6] px-2.5 py-1 text-[11px] disabled:opacity-50"
						>
							Save
						</button>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => void revealCreds()}
							disabled={loading}
							className="text-[11px] font-medium text-[#BD0C16] disabled:opacity-50"
						>
							Reveal password
						</button>
						{sshCommand ? (
							<button
								type="button"
								onClick={() => void copyCommand(sshCommand)}
								className="text-[11px] font-medium text-[#1A1A1A]"
							>
								{copied ? "Copied" : "Copy SSH"}
							</button>
						) : null}
					</div>
					{creds ? (
						<div className="rounded-2xl border border-[#ECEAE6] bg-[#F8F6F2] px-3 py-2 font-mono text-[11px] text-[#1A1A1A]">
							<p>{creds.opsPassword}</p>
							<p className="mt-1 text-[#555555]">{creds.sshCommand}</p>
						</div>
					) : null}
				</div>
			) : null}

			{error ? <p className="text-[11px] text-[#BD0C16]">{error}</p> : null}
		</div>
	)
}
