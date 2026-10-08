import path from "path"
import { promises as fs } from "fs"
import { getDeviceScriptsDir } from "@/lib/env"

const ALLOWED_SCRIPTS = new Set([
	"bootstrap.sh",
	"bin/bb-run",
	"lib/common.sh",
	"stages/00-encryption-gate.sh",
	"stages/10-ops-user.sh",
	"stages/15-debloat.sh",
	"stages/20-purge-users.sh",
	"stages/30-setup-kiosk.sh",
	"stages/40-setup-updater.sh",
])

const PUBLIC_SCRIPTS = new Set(["bootstrap.sh"])

/** While a pairing code is live, only foothold scripts — not destructive later stages. */
const PAIRING_CODE_SCRIPTS = new Set([
	"bootstrap.sh",
	"bin/bb-run",
	"lib/common.sh",
	"stages/10-ops-user.sh",
])

export function normalizeScriptPath(raw: string | string[]): string | null {
	const joined = Array.isArray(raw) ? raw.join("/") : raw
	const cleaned = joined.replace(/\\/g, "/").replace(/^\/+/, "")
	if (!cleaned || cleaned.includes("..") || cleaned.includes("\0")) {
		return null
	}
	if (!ALLOWED_SCRIPTS.has(cleaned)) {
		return null
	}
	return cleaned
}

export function isPublicDeviceScript(scriptPath: string): boolean {
	return PUBLIC_SCRIPTS.has(scriptPath)
}

export function isPairingCodeAllowedScript(scriptPath: string): boolean {
	return PAIRING_CODE_SCRIPTS.has(scriptPath)
}

function candidateRoots(): string[] {
	const configured = getDeviceScriptsDir()
	const cwd = process.cwd()
	return [configured, path.resolve(cwd, "device-scripts")].filter(
		(value): value is string => Boolean(value),
	)
}

export async function readDeviceScript(scriptPath: string): Promise<Buffer | null> {
	const normalized = normalizeScriptPath(scriptPath)
	if (!normalized) {
		return null
	}

	for (const root of candidateRoots()) {
		const absolute = path.resolve(root, normalized)
		if (!absolute.startsWith(path.resolve(root))) {
			continue
		}
		try {
			return await fs.readFile(absolute)
		} catch {
			// try next root
		}
	}
	return null
}

/** Alias map for bb-run friendly names → script paths. */
export const BB_RUN_ALIASES: Record<string, string> = {
	"purge-users": "stages/20-purge-users.sh",
	"setup-kiosk": "stages/30-setup-kiosk.sh",
	"setup-updater": "stages/40-setup-updater.sh",
	debloat: "stages/15-debloat.sh",
	"encryption-gate": "stages/00-encryption-gate.sh",
	"ops-user": "stages/10-ops-user.sh",
}

export function resolveBbRunScript(name: string): string | null {
	const alias = BB_RUN_ALIASES[name]
	if (alias) {
		return alias
	}
	if (ALLOWED_SCRIPTS.has(name)) {
		return name
	}
	if (ALLOWED_SCRIPTS.has(`stages/${name}`)) {
		return `stages/${name}`
	}
	if (ALLOWED_SCRIPTS.has(`stages/${name}.sh`)) {
		return `stages/${name}.sh`
	}
	return null
}
