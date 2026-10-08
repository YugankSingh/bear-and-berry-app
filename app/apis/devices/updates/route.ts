import path from "path"
import { promises as fs } from "fs"
import { requireDeviceAuth } from "@/lib/devices/auth"
import { getDeviceReleasesDir, getSelfUrl } from "@/lib/env"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

const COMPONENTS = ["ui", "api", "agent"] as const

function releasesRoot(): string {
	return getDeviceReleasesDir() || path.resolve(process.cwd(), "device-releases")
}

export async function GET(request: Request) {
	try {
		await requireDeviceAuth(request)
		const base = getSelfUrl().replace(/\/$/, "")
		const updates = []
		for (const component of COMPONENTS) {
			try {
				const raw = await fs.readFile(path.join(releasesRoot(), component, "manifest.json"), "utf8")
				const parsed = JSON.parse(raw) as {
					version?: string
					sha256?: string
					filename?: string
				}
				if (!parsed.version || !parsed.sha256 || !parsed.filename) {
					continue
				}
				updates.push({
					component,
					version: parsed.version,
					sha256: parsed.sha256,
					filename: parsed.filename,
					url: `${base}/apis/devices/updates/${component}/download`,
				})
			} catch {
				// component not published yet
			}
		}
		return ok({ updates })
	} catch (error) {
		return handleApiError(error)
	}
}
