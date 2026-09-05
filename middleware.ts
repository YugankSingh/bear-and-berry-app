import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { ROLES, type Role } from "@/types/domain"

const SESSION_COOKIE = "bb_session"
const PUBLIC_PATHS = ["/login", "/apis/health", "/apis/leads", "/apis/auth/login", "/apis/public"]

function isPublicPath(pathname: string): boolean {
	if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
		return true
	}
	return pathname.startsWith("/_next") || pathname === "/favicon.ico"
}

function getSecret(): Uint8Array | null {
	const secret = process.env.AUTH_SECRET
	if (!secret || secret.length < 32) {
		return null
	}
	return new TextEncoder().encode(secret)
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
	const token = request.cookies.get(SESSION_COOKIE)?.value
	const secret = getSecret()
	if (!token || !secret) {
		return false
	}

	try {
		const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
		return typeof payload.sub === "string" && ROLES.includes(payload.role as Role)
	} catch {
		return false
	}
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	if (isPublicPath(pathname)) {
		if (pathname === "/login" && (await hasValidSession(request))) {
			return NextResponse.redirect(new URL("/overview", request.url))
		}
		return NextResponse.next()
	}

	if (await hasValidSession(request)) {
		if (pathname === "/") {
			return NextResponse.redirect(new URL("/overview", request.url))
		}
		return NextResponse.next()
	}

	if (pathname.startsWith("/apis/")) {
		return NextResponse.json(
			{ ok: false, code: "UNAUTHORIZED", error: "Sign in to continue." },
			{ status: 401 },
		)
	}

	const loginUrl = new URL("/login", request.url)
	loginUrl.searchParams.set("next", pathname)
	return NextResponse.redirect(loginUrl)
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
