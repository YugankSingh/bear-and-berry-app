import { NextResponse } from "next/server"
import { resolveActivePairingCode } from "@/lib/repositories/device-pairing"
import { requireDeviceAuth } from "@/lib/devices/auth"
import {
	isPublicDeviceScript,
	normalizeScriptPath,
	readDeviceScript,
	resolveBbRunScript,
} from "@/lib/devices/scripts"
import { fail } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"
import { AuthError } from "@/lib/auth/require-auth"

type RouteContext = {
	params: Promise<{ path: string[] }>
}

async function authorizeScriptAccess(request: Request, scriptPath: string): Promise<void> {
	if (isPublicDeviceScript(scriptPath)) {
		return
	}

	const url = new URL(request.url)
	const code = url.searchParams.get("code")
	const bearer = request.headers.get("authorization")

	if (bearer) {
		await requireDeviceAuth(request)
		return
	}

	if (code) {
		const session = await resolveActivePairingCode(code)
		if (!session) {
			throw new AuthError("Pairing code is invalid, expired, or revoked.", 403)
		}
		return
	}

	throw new AuthError("Device API key or pairing code required.", 401)
}

export async function GET(request: Request, context: RouteContext) {
	try {
		const { path: segments } = await context.params
		let scriptPath = normalizeScriptPath(segments)
		if (!scriptPath && segments.length === 1) {
			scriptPath = resolveBbRunScript(segments[0]!)
			if (scriptPath && !normalizeScriptPath(scriptPath)) {
				scriptPath = null
			}
		}
		if (!scriptPath) {
			return fail("NOT_FOUND", "Unknown device script.", 404)
		}

		await authorizeScriptAccess(request, scriptPath)

		const body = await readDeviceScript(scriptPath)
		if (!body) {
			return fail("NOT_FOUND", "Device script file is not available on this server.", 404)
		}

		return new NextResponse(new Uint8Array(body), {
			status: 200,
			headers: {
				"Content-Type": "text/x-shellscript; charset=utf-8",
				"Cache-Control": "no-store",
				"Content-Disposition": `inline; filename="${scriptPath.split("/").pop()}"`,
			},
		})
	} catch (error) {
		return handleApiError(error)
	}
}
