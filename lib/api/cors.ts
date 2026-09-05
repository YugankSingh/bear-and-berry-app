import { getCorsOrigins } from "@/lib/env"

export function corsHeaders(request: Request): HeadersInit {
	const origin = request.headers.get("origin")
	const allowed = getCorsOrigins()
	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
		"Access-Control-Max-Age": "86400",
		Vary: "Origin",
	}

	if (origin && allowed.includes(origin)) {
		headers["Access-Control-Allow-Origin"] = origin
	}

	return headers
}

export function withCors(request: Request, extra?: HeadersInit): HeadersInit {
	return {
		...corsHeaders(request),
		...extra,
	}
}
