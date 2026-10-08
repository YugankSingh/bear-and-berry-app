import { cache } from "react"
import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { cookies, headers } from "next/headers"

import { getAuthSecret, getEnv, isProductionLike } from "@/lib/env"
import type { Role, SessionUser, UserRecord } from "@/types/domain"
import { resolveAccessStatus } from "@/lib/auth/access"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { listOrganizations } from "@/lib/repositories/organizations"
import type { UserDocument } from "@/lib/db/documents"
import { mapUser } from "@/lib/db/mappers"
import { titleCase } from "@/lib/format"
import { parseGrants, stringifyGrants, type AccessibleOrg } from "@/lib/auth/grants"
import { permissionsFromGrants, resolveAccessibleOrgs } from "@/lib/auth/compile-grants"
import { buildUserGrants } from "@/lib/auth/resolve-user-grants"
import {
	ADMIN_WORKSPACE,
	ORGANIZATION_ROOT,
	ORG_HEADER,
	PATH_HEADER,
	WORKSPACE_COOKIE,
	applyWorkspaceCookie,
	canAccessAdminWorkspace,
	defaultWorkspace,
	readWorkspaceCookie,
} from "@/lib/auth/workspace"

export const SESSION_COOKIE = "bb_session"

type SessionClaims = JWTPayload & {
	sub: string
	email: string
	name: string
	role: Role
	roleName?: string
	roleRank?: number
	orgId: string
	orgSlug: string
	tags?: string[]
	accessStatus?: string
	grants?: string[]
	accessibleOrgs?: AccessibleOrg[]
	activeOrgSlug?: string
	canAccessAdmin?: boolean
}

function getSecretKey(): Uint8Array {
	return new TextEncoder().encode(getAuthSecret())
}

function sessionCookieOptions(maxAgeSeconds: number) {
	return {
		httpOnly: true as const,
		sameSite: "lax" as const,
		secure: isProductionLike(),
		path: "/",
		maxAge: maxAgeSeconds,
	}
}

function sessionTtlSeconds(): number {
	return getEnv().SESSION_TTL_DAYS * 24 * 60 * 60
}

export async function createSessionToken(user: SessionUser): Promise<string> {
	const grantKeys = user.grantKeys.length > 0 ? user.grantKeys : stringifyGrants(user.grants)

	return new SignJWT({
		email: user.email,
		name: user.name,
		role: user.role,
		roleName: user.roleName,
		roleRank: user.roleRank,
		orgId: user.orgId,
		orgSlug: user.orgSlug,
		tags: user.tags,
		accessStatus: user.accessStatus,
		grants: grantKeys,
		accessibleOrgs: user.accessibleOrgs,
		activeOrgSlug: user.activeOrgSlug,
		canAccessAdmin: user.canAccessAdmin,
	})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setSubject(user.id)
		.setIssuedAt()
		.setExpirationTime(`${getEnv().SESSION_TTL_DAYS}d`)
		.sign(getSecretKey())
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
	try {
		const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] })
		const claims = payload as SessionClaims
		if (!claims.sub || !claims.email || !claims.name) {
			return null
		}
		// Role, org, and grants may be empty (pending requests, people approved with no
		// permissions), but the claims must exist so tokens from older formats are re-issued.
		if (typeof claims.role !== "string" || typeof claims.orgSlug !== "string" || !Array.isArray(claims.grants)) {
			return null
		}

		const grantKeys = claims.grants

		const grants = parseGrants(grantKeys)
		const permissions = permissionsFromGrants(grants)
		const accessibleOrgs = normalizeAccessibleOrgs(claims.accessibleOrgs)

		return {
			id: claims.sub,
			email: claims.email,
			name: claims.name,
			role: claims.role,
			roleName: claims.roleName || (claims.role ? titleCase(claims.role) : "No role"),
			roleRank: typeof claims.roleRank === "number" ? claims.roleRank : 0,
			orgId: claims.orgId ?? "",
			orgSlug: claims.orgSlug ?? "",
			tags: Array.isArray(claims.tags) ? claims.tags : [],
			accessStatus: resolveAccessStatus(claims.accessStatus),
			memberships: [],
			extraGrants: [],
			grants,
			grantKeys,
			permissions,
			accessibleOrgs,
			activeOrgSlug: typeof claims.activeOrgSlug === "string" ? claims.activeOrgSlug : "",
			canAccessAdmin:
				Boolean(claims.canAccessAdmin) || canAccessAdminWorkspace({ grants, permissions }),
		}
	} catch {
		return null
	}
}

export async function hasSessionCookie(): Promise<boolean> {
	const store = await cookies()
	return Boolean(store.get(SESSION_COOKIE)?.value)
}

async function loadSessionUser(): Promise<SessionUser | null> {
	const store = await cookies()
	const token = store.get(SESSION_COOKIE)?.value
	if (!token) {
		return null
	}

	const session = await readSessionToken(token)
	if (!session) {
		return null
	}

	const request = await readRequestWorkspace()
	if (request?.path === ORGANIZATION_ROOT || request?.path === `${ORGANIZATION_ROOT}/`) {
		return { ...session, activeOrgSlug: "" }
	}
	if (request?.path.startsWith("/admin")) {
		return applyWorkspaceCookie(session, ADMIN_WORKSPACE)
	}
	if (request?.orgId) {
		return applyWorkspaceCookie(session, request.orgId)
	}
	return applyWorkspaceCookie(session, store.get(WORKSPACE_COOKIE)?.value)
}

/** Request-scoped: layout + page + shell share one hydrate. */
export const getSessionUser = cache(loadSessionUser)

export async function setSessionCookie(user: SessionUser): Promise<void> {
	const store = await cookies()
	const options = sessionCookieOptions(sessionTtlSeconds())
	const workspace = user.activeOrgSlug || (user.canAccessAdmin ? ADMIN_WORKSPACE : "")

	store.set(SESSION_COOKIE, await createSessionToken(user), options)
	if (workspace) {
		store.set(WORKSPACE_COOKIE, workspace, options)
	}
}

export async function setWorkspaceCookie(workspace: string): Promise<void> {
	const store = await cookies()
	store.set(WORKSPACE_COOKIE, workspace, sessionCookieOptions(sessionTtlSeconds()))
}

export async function clearSessionCookie(): Promise<void> {
	const store = await cookies()
	store.delete(SESSION_COOKIE)
	store.delete(WORKSPACE_COOKIE)
}

/** Compile grants once, build session + API user record, set cookie. */
export async function establishSession(user: UserDocument): Promise<{
	session: SessionUser
	record: UserRecord
}> {
	const hydrated = await hydrateAuthUser(user)
	await setSessionCookie(hydrated.session)
	return hydrated
}

export async function hydrateAuthUser(user: UserDocument): Promise<{
	session: SessionUser
	record: UserRecord
}> {
	const [role, organizations] = await Promise.all([findRoleBySlug(user.role), listOrganizations()])
	const compiled = buildUserGrants(
		{
			role: user.role,
			orgSlug: user.orgSlug,
			memberships: user.memberships,
			extraGrants: user.extraGrants,
		},
		role,
	)

	const accessibleOrgs = resolveAccessibleOrgs(
		compiled.grants,
		compiled.memberships,
		organizations.map((org) => ({
			id: org.id,
			slug: org.slug,
			name: org.name,
			tags: org.tags,
		})),
	)

	const session: SessionUser = {
		id: user._id.toHexString(),
		name: user.name,
		email: user.email,
		role: user.role,
		roleName: role?.name ?? (user.role ? titleCase(user.role) : "No role"),
		roleRank: role?.rank ?? 0,
		orgId: user.orgId?.toHexString() ?? "",
		orgSlug: user.orgSlug,
		tags: user.tags,
		accessStatus: resolveAccessStatus(user.accessStatus),
		memberships: compiled.memberships,
		extraGrants: compiled.extraGrants,
		grants: compiled.grants,
		grantKeys: compiled.grantKeys,
		permissions: compiled.permissions,
		accessibleOrgs,
		activeOrgSlug: "",
		canAccessAdmin: canAccessAdminWorkspace({
			grants: compiled.grants,
			permissions: compiled.permissions,
		}),
	}

	const workspace = (await readWorkspaceCookie()) ?? defaultWorkspace(session)
	return {
		session: applyWorkspaceCookie(session, workspace),
		record: mapUser(user, role, compiled),
	}
}

function normalizeAccessibleOrgs(values: AccessibleOrg[] | undefined): AccessibleOrg[] {
	if (!Array.isArray(values)) {
		return []
	}
	return values.map((org) => ({
		id: org.id || org.slug,
		slug: org.slug,
		name: org.name,
		tags: Array.isArray(org.tags) ? org.tags : [],
	}))
}

async function readRequestWorkspace(): Promise<{ path: string; orgId: string } | null> {
	try {
		const requestHeaders = await headers()
		return {
			path: requestHeaders.get(PATH_HEADER) ?? "",
			orgId: requestHeaders.get(ORG_HEADER) ?? "",
		}
	} catch {
		return null
	}
}
