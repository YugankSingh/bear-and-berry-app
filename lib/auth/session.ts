import { SignJWT, jwtVerify, type JWTPayload } from "jose"
import { cookies, headers } from "next/headers"
import { getAuthSecret, getEnv, isProductionLike } from "@/lib/env"
import type { Permission, ResourceAccess, Role, SessionUser } from "@/types/domain"
import { resolveAccessStatus } from "@/lib/auth/access"
import { isSystemAdmin, resolvePermissions } from "@/lib/auth/permissions"
import { resolveResourceAccess } from "@/lib/auth/resource-access"
import { GLOBAL_SCOPE } from "@/lib/auth/scope"
import { findRoleBySlug } from "@/lib/repositories/roles"
import { listOrganizations } from "@/lib/repositories/organizations"
import type { UserDocument } from "@/lib/db/documents"
import { titleCase } from "@/lib/format"
import {
	GRANT_WILDCARD,
	hasOrgWildcard,
	normalizeMemberships,
	parseGrants,
	stringifyGrants,
	type AccessGrant,
	type AccessibleOrg,
	type OrgMembership,
} from "@/lib/auth/grants"
import {
	compileGrants,
	membershipsFromAccess,
	permissionsFromGrants,
} from "@/lib/auth/compile-grants"
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
	scopePath: string
	tags: string[]
	accessStatus?: string
	resourceAccess?: ResourceAccess
	extraPermissions?: Permission[]
	permissions?: Permission[]
	memberships?: OrgMembership[]
	extraGrants?: string[]
	grants?: string[]
	accessibleOrgs?: AccessibleOrg[]
	activeOrgSlug?: string
	canAccessAdmin?: boolean
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
		roleName: user.roleName,
		roleRank: user.roleRank,
		orgId: user.orgId,
		orgSlug: user.orgSlug,
		scopePath: user.scopePath,
		tags: user.tags,
		accessStatus: user.accessStatus,
		resourceAccess: user.resourceAccess,
		extraPermissions: user.extraPermissions,
		permissions: user.permissions,
		memberships: user.memberships,
		extraGrants: stringifyGrants(user.extraGrants),
		grants: user.grantKeys,
		accessibleOrgs: user.accessibleOrgs,
		activeOrgSlug: user.activeOrgSlug,
		canAccessAdmin: user.canAccessAdmin,
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
		if (typeof claims.role !== "string" || claims.role.length === 0) {
			return null
		}
		const extraPermissions = resolvePermissions(null, claims.extraPermissions)
		const extraGrants = parseGrants(claims.extraGrants)
		const memberships = normalizeMemberships(claims.memberships)
		const resourceAccess = resolveResourceAccess({
			permissions: resolvePermissions(null, claims.permissions),
			extraPermissions,
			resourceAccess: claims.resourceAccess,
			scopePath: claims.scopePath,
			orgSlug: claims.orgSlug,
		})
		const grants = hydrateGrants({
			grantKeys: claims.grants,
			permissions: resolvePermissions(null, claims.permissions),
			extraPermissions,
			extraGrants,
			memberships,
			resourceAccess,
			orgSlug: claims.orgSlug,
			role: claims.role,
		})
		const grantKeys = stringifyGrants(grants)
		const permissions = uniquePermissions([
			...resolvePermissions({ permissions: resolvePermissions(null, claims.permissions) }, extraPermissions),
			...permissionsFromGrants(grants),
		])
		const accessibleOrgs = normalizeAccessibleOrgs(claims.accessibleOrgs)
		const canAccessAdmin = Boolean(claims.canAccessAdmin) || canAccessAdminWorkspace({ grants, permissions })
		return {
			id: claims.sub,
			email: claims.email,
			name: claims.name,
			role: claims.role,
			roleName: claims.roleName || titleCase(claims.role),
			roleRank: typeof claims.roleRank === "number" ? claims.roleRank : 0,
			orgId: claims.orgId,
			orgSlug: claims.orgSlug,
			scopePath: claims.scopePath || GLOBAL_SCOPE,
			tags: Array.isArray(claims.tags) ? claims.tags : [],
			accessStatus: resolveAccessStatus(claims.accessStatus),
			resourceAccess,
			memberships: memberships.length
				? memberships
				: membershipsFromAccess({
						role: claims.role,
						resourceAccess,
						orgSlug: claims.orgSlug,
						permissions,
					}),
			extraPermissions,
			extraGrants,
			grants,
			grantKeys,
			permissions,
			accessibleOrgs,
			activeOrgSlug: typeof claims.activeOrgSlug === "string" ? claims.activeOrgSlug : "",
			canAccessAdmin,
		}
	} catch {
		return null
	}
}

export async function hasSessionCookie(): Promise<boolean> {
	const store = await cookies()
	return Boolean(store.get(SESSION_COOKIE)?.value)
}

export async function getSessionUser(): Promise<SessionUser | null> {
	const store = await cookies()
	const token = store.get(SESSION_COOKIE)?.value
	if (!token) {
		return null
	}
	const session = await readSessionToken(token)
	if (!session) {
		return null
	}
	const unrestricted = isSystemAdmin(session) || hasOrgWildcard(session.grants)
	const withOrgs = unrestricted
		? {
				...session,
				accessibleOrgs: (await listOrganizations()).map((org) => ({
					id: org.id,
					slug: org.slug,
					name: org.name,
					tags: org.tags,
				})),
			}
		: session
	const request = await readRequestWorkspace()
	if (request?.path === ORGANIZATION_ROOT || request?.path === `${ORGANIZATION_ROOT}/`) {
		return { ...withOrgs, activeOrgSlug: "" }
	}
	if (request?.path.startsWith("/admin")) {
		return applyWorkspaceCookie(withOrgs, ADMIN_WORKSPACE)
	}
	if (request?.orgId) {
		return applyWorkspaceCookie(withOrgs, request.orgId)
	}
	return applyWorkspaceCookie(withOrgs, store.get(WORKSPACE_COOKIE)?.value)
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
	const token = await createSessionToken(user)
	const store = await cookies()
	const ttlDays = getEnv().SESSION_TTL_DAYS
	const workspace = user.activeOrgSlug || (user.canAccessAdmin ? ADMIN_WORKSPACE : "")
	store.set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: isProductionLike(),
		path: "/",
		maxAge: ttlDays * 24 * 60 * 60,
	})
	if (workspace) {
		store.set(WORKSPACE_COOKIE, workspace, {
			httpOnly: true,
			sameSite: "lax",
			secure: isProductionLike(),
			path: "/",
			maxAge: ttlDays * 24 * 60 * 60,
		})
	}
}

export async function setWorkspaceCookie(workspace: string): Promise<void> {
	const store = await cookies()
	store.set(WORKSPACE_COOKIE, workspace, {
		httpOnly: true,
		sameSite: "lax",
		secure: isProductionLike(),
		path: "/",
		maxAge: getEnv().SESSION_TTL_DAYS * 24 * 60 * 60,
	})
}

export async function clearSessionCookie(): Promise<void> {
	const store = await cookies()
	store.delete(SESSION_COOKIE)
	store.delete(WORKSPACE_COOKIE)
}

export async function toSessionUser(user: UserDocument): Promise<SessionUser> {
	const [role, organizations] = await Promise.all([findRoleBySlug(user.role), listOrganizations()])
	const extraPermissions = resolvePermissions(null, user.extraPermissions)
	const extraGrants = user.extraGrants ?? []
	const resourceAccess = resolveResourceAccess({
		...user,
		permissions: resolvePermissions(role, extraPermissions),
		extraPermissions,
	})
	const rolePermissions = resolvePermissions(role, extraPermissions)
	const memberships = normalizeMemberships(
		Array.isArray(user.memberships)
			? user.memberships
			: membershipsFromAccess({
					role: user.role,
					resourceAccess,
					orgSlug: user.orgSlug,
					permissions: rolePermissions,
				}),
	)
	const grants = compileGrants({
		role,
		permissions: rolePermissions,
		extraPermissions,
		extraGrants,
		memberships,
		resourceAccess,
		orgSlug: user.orgSlug,
	})
	const grantKeys = stringifyGrants(grants)
	const permissions = uniquePermissions([...rolePermissions, ...permissionsFromGrants(grants)])
	const accessibleOrgs: AccessibleOrg[] = organizations
		.filter((org) =>
			memberships.some((membership) => {
				if (membership.org === GRANT_WILDCARD) return true
				if (membership.org && membership.org === org.slug) return true
				if (membership.orgTag) return org.tags.includes(membership.orgTag)
				return false
			}) ||
			grants.some((grant) => grant.org === GRANT_WILDCARD || grant.org === org.slug || (grant.orgTag ? org.tags.includes(grant.orgTag) : false)),
		)
		.map((org) => ({ id: org.id, slug: org.slug, name: org.name, tags: org.tags }))
	const canAccessAdmin = canAccessAdminWorkspace({ grants, permissions })
	const session: SessionUser = {
		id: user._id.toHexString(),
		name: user.name,
		email: user.email,
		role: user.role,
		roleName: role?.name ?? titleCase(user.role),
		roleRank: role?.rank ?? 0,
		orgId: user.orgId.toHexString(),
		orgSlug: user.orgSlug,
		scopePath: user.scopePath,
		tags: user.tags,
		accessStatus: resolveAccessStatus(user.accessStatus),
		resourceAccess,
		memberships,
		extraPermissions,
		extraGrants,
		grants,
		grantKeys,
		permissions,
		accessibleOrgs,
		activeOrgSlug: "",
		canAccessAdmin,
	}
	const workspace = (await readWorkspaceCookie()) ?? defaultWorkspace(session)
	return applyWorkspaceCookie(session, workspace)
}

function hydrateGrants(input: {
	grantKeys?: string[]
	permissions: Permission[]
	extraPermissions: Permission[]
	extraGrants: AccessGrant[]
	memberships: OrgMembership[]
	resourceAccess: ResourceAccess
	orgSlug: string
	role: string
}): AccessGrant[] {
	const fromJwt = parseGrants(input.grantKeys)
	if (fromJwt.length > 0) {
		return fromJwt
	}
	return compileGrants({
		permissions: input.permissions,
		extraPermissions: input.extraPermissions,
		extraGrants: input.extraGrants,
		memberships: input.memberships,
		resourceAccess: input.resourceAccess,
		orgSlug: input.orgSlug,
		role: { slug: input.role, permissions: input.permissions },
	})
}

function uniquePermissions(values: readonly Permission[]): Permission[] {
	return [...new Set(values)]
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
