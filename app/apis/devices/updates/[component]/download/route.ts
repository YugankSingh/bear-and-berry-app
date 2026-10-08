import path from "path"
import { promises as fs } from "fs"
import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireDeviceAuth } from "@/lib/devices/auth"
import { getDeviceReleasesDir } from "@/lib/env"
import { fail } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"

const COMPONENTS = ["ui", "api", "agent"] as const

function releasesRoot(): string {
	return getDeviceReleasesDir() || path.resolve(process.cwd(), "device-releases")
}

type RouteContext = {
	params: Promise<{ component: string }>
}

export async function GET(request: Request, context: RouteContext) {
	try {
		await requireDeviceAuth(request)
		const { component: raw } = await context.params
		const component = z.enum(COMPONENTS).parse(raw)
		const manifestPath = path.join(releasesRoot(), component, "manifest.json")
		const rawManifest = await fs.readFile(manifestPath, "utf8")
		const manifest = JSON.parse(rawManifest) as {
			version?: string
			sha256?: string
			filename?: string
		}
		if (!manifest.filename || !manifest.sha256) {
			return fail("NOT_FOUND", "No release published for that component.", 404)
		}
		const filePath = path.resolve(releasesRoot(), component, manifest.filename)
		if (!filePath.startsWith(path.resolve(releasesRoot(), component))) {
			return fail("NOT_FOUND", "Release file not found.", 404)
		}
		const body = await fs.readFile(filePath)
		const digest = createHash("sha256").update(body).digest("hex")
		if (digest !== manifest.sha256) {
			return fail("SERVER_ERROR", "Release checksum mismatch on server.", 500)
		}
		return new NextResponse(new Uint8Array(body), {
			status: 200,
			headers: {
				"Content-Type": "application/gzip",
				"Cache-Control": "no-store",
				"Content-Disposition": `attachment; filename="${manifest.filename}"`,
				"X-Content-SHA256": digest,
			},
		})
	} catch (error) {
		return handleApiError(error)
	}
}
