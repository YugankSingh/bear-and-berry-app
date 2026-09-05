import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { cookies } from "next/headers"
import { getAuthSecret, getEnv, isProductionLike } from "@/lib/env"
import { ROLES, type Role, type SessionUser } from "@/types/domain"
import { GLOBAL_SCOPE } from "@/lib/auth/scope"

export const SESSION_COOKIE = "bb_session"

type SessionClaims = JWTPayload & {
	sub: string
	email: string
	name: string
	role: Role
	orgId: string
	orgSlug: string
	scopePath: string
	tags: string[]
}

function getSecretKey(): Uint8Array {
	return new TextEncoder().encode(getAuthSecret())
}

export async function createSessionToken(user: SessionUser): Promise<string> {
	const ttlDays = getEnv().SESSION_TTL_DAYS
	return new SignJWT({
		email: user.email,
		name: user.name,
		role: user.role,
		orgId: user.orgId,
		orgSlug: user.orgSlug,
		scopePath: user.scopePath,
		tags: user.tags,
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setSubject(user.id)
		.setIssuedAt()
		.setExpirationTime(`${ttlDays}d`)
		.sign(getSecretKey())
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
	try {
		const { payload } = await jwtVerify(token, getSecretKey(), {
			algorithms: ["HS256"],
		})
		const claims = payload as SessionClaims
		if (!claims.sub || !claims.email || !claims.name || !claims.orgId || !claims.orgSlug) {
			return null
		}
		if (!ROLES.includes(claims.role)) {
			return null
		}
		return {
			id: claims.sub,
			email: claims.email,
			name: claims.name,
			role: claims.role,
			orgId: claims.orgId,
			orgSlug: claims.orgSlug,
			scopePath: claims.scopePath || GLOBAL_SCOPE,
			tags: Array.isArray(claims.tags) ? claims.tags : [],
		}
	} catch {
		return null
	}
}

export async function getSessionUser(): Promise<SessionUser | null> {
	const store = await cookies()
	const token = store.get(SESSION_COOKIE)?.value
	if (!token) {
		return null
	}
	return readSessionToken(token)
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
	const token = await createSessionToken(user)
	const store = await cookies()
	const ttlDays = getEnv().SESSION_TTL_DAYS
	store.set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: isProductionLike(),
		path: "/",
		maxAge: ttlDays * 24 * 60 * 60,
	})
}

export async function clearSessionCookie(): Promise<void> {
	const store = await cookies()
	store.delete(SESSION_COOKIE)
}