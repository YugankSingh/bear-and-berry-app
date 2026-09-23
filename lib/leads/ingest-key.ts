import { getLandingKey, isProductionLike } from "@/lib/env"

export function hasValidIngestKey(request: Request): boolean {
	const expected = getLandingKey()
	if (!expected) {
		return !isProductionLike()
	}

	const headerKey = request.headers.get("x-landing-key") ?? request.headers.get("x-api-key")
	const bearer = request.headers.get("authorization")
	const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null
	return headerKey === expected || token === expected
}

export function ingestKeyHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	}
	const key = getLandingKey()
	if (key) {
		headers["x-landing-key"] = key
		headers["x-api-key"] = key
	}
	return headers
}
