import { NextResponse } from "next/server"
import { clearSessionCookie } from "@/lib/auth/session"
import { getAppUrl } from "@/lib/env"
import { ok } from "@/lib/api/response"

export async function POST() {
	await clearSessionCookie()
	return ok({ signedOut: true })
}

export async function GET(request: Request) {
	await clearSessionCookie()
	return NextResponse.redirect(new URL("/login", request.url || getAppUrl()))
}
