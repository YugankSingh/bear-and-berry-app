import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { hasDashboardAccess } from "@/lib/auth/access"
import { ORGANIZATION_ROOT, ORG_HEADER, PATH_HEADER, WORKSPACE_COOKIE, parseOrganizationPath } from "@/lib/auth/org-path"
import type { AccessStatus } from "@/types/domain"

const SESSION_COOKIE = "bb_session"
const PUBLIC_PATHS = [
	"/login",
	"/signup",
	"/waitlist",
	"/verify",
	"/invite",
	"/access-removed",
	"/apis/health",
	"/apis/leads",
	"/apis/auth/login",
	"/apis/auth/lookup",
	"/apis/auth/signup",
	"/apis/auth/verify-otp",
	"/apis/auth/resend-otp",
	"/apis/auth/accept-invite",
	"/apis/auth/invite",
	"/apis/auth/logout",
	"/apis/public",
]
const WAITLIST_API_PATHS = ["/apis/auth/logout", "/apis/auth/me"]

type SessionState =
	| { valid: false }
	| { valid: true; accessStatus: AccessStatus; canAccessAdmin: boolean; activeOrgSlug: string }

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

function resolveJwtAccessStatus(value: unknown): AccessStatus {
	if (value === "waitlisted" || value === "pending_invite") {
		return value
	}
	return "invited"
}

async function readSession(request: NextRequest): Promise<SessionState> {
	const token = request.cookies.get(SESSION_COOKIE)?.value
	const secret = getSecret()
	if (!token || !secret) {
		return { valid: false }
	}

	try {
		const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
		if (typeof payload.sub !== "string" || typeof payload.role !== "string" || payload.role.length === 0) {
			return { valid: false }
		}
		return {
			valid: true,
			accessStatus: resolveJwtAccessStatus(payload.accessStatus),
			canAccessAdmin: payload.canAccessAdmin === true,
			activeOrgSlug: typeof payload.activeOrgSlug === "string" ? payload.activeOrgSlug : "",
		}
	} catch {
		return { valid: false }
	}
}

function signedInHome(request: NextRequest, session: Extract<SessionState, { valid: true }>): NextResponse {
	const dest = hasDashboardAccess(session.accessStatus) ? ORGANIZATION_ROOT : "/waitlist"
	return NextResponse.redirect(new URL(dest, request.url))
}

function withWorkspaceHeaders(request: NextRequest): NextResponse {
	const requestHeaders = new Headers(request.headers)
	requestHeaders.set(PATH_HEADER, request.nextUrl.pathname)
	const parsed = parseOrganizationPath(request.nextUrl.pathname)
	if (parsed) {
		requestHeaders.set(ORG_HEADER, parsed.orgId)
	}
	const response = NextResponse.next({ request: { headers: requestHeaders } })
	if (parsed) {
		response.cookies.set(WORKSPACE_COOKIE, parsed.orgId, {
			httpOnly: true,
			sameSite: "lax",
			path: "/",
		})
	}
	return response
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const session = await readSession(request)

	if (isPublicPath(pathname)) {
		if ((pathname === "/login" || pathname === "/signup" || pathname === "/verify") && session.valid) {
			return signedInHome(request, session)
		}
		if (pathname === "/waitlist") {
			if (!session.valid) {
				return NextResponse.redirect(new URL("/login", request.url))
			}
			if (hasDashboardAccess(session.accessStatus)) {
				return NextResponse.redirect(new URL(ORGANIZATION_ROOT, request.url))
			}
		}
		return NextResponse.next()
	}

	if (session.valid) {
		if (!hasDashboardAccess(session.accessStatus)) {
			if (pathname.startsWith("/apis/")) {
				if (WAITLIST_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
					return NextResponse.next()
				}
				return NextResponse.json(
					{ ok: false, code: "FORBIDDEN", error: "Your account is on the waitlist." },
					{ status: 403 },
				)
			}
			return NextResponse.redirect(new URL("/waitlist", request.url))
		}
		if (pathname === "/") {
			return signedInHome(request, session)
		}
		return withWorkspaceHeaders(request)
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
