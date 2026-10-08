export const SESSION_COOKIE = "bb_session"

export const PUBLIC_PATHS = [
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
	"/apis/devices/pair",
	"/apis/devices/scripts",
	"/apis/devices/heartbeat",
	"/apis/devices/rotate-key",
	"/apis/devices/updates",
] as const

export const WAITLIST_API_PATHS = ["/apis/auth/logout", "/apis/auth/me"] as const

export function isPublicPath(pathname: string): boolean {
	if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
		return true
	}
	return pathname.startsWith("/_next") || pathname === "/favicon.ico"
}

export function isWaitlistAllowedApi(pathname: string): boolean {
	return WAITLIST_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
