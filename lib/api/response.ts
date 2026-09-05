import { NextResponse } from "next/server"
import type { ApiErrorCode, ApiFailure, ApiSuccess } from "@/types/api"

function jsonHeaders(extra?: HeadersInit): Headers {
	const headers = new Headers(extra)
	headers.set("Content-Type", "application/json")
	return headers
}

export function ok<T>(data: T, status = 200, extra?: HeadersInit): NextResponse<ApiSuccess<T>> {
	return NextResponse.json({ ok: true, data }, { status, headers: jsonHeaders(extra) })
}

export function fail(
	code: ApiErrorCode,
	error: string,
	status: number,
	extra?: HeadersInit,
): NextResponse<ApiFailure> {
	return NextResponse.json({ ok: false, code, error }, { status, headers: jsonHeaders(extra) })
}
