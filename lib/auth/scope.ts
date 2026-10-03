import { hasAllOrganizations } from "@/lib/auth/permissions"
import { hasOrgWildcard } from "@/lib/auth/grants"
import { orgSlugFromPath } from "@/lib/auth/fleet-access"
import type { SessionUser } from "@/types/domain"

export const GLOBAL_SCOPE = "/"
export const VENDFORGE_LABS_SLUG = "vendforge-labs"
export const BEAR_AND_BERRY_SLUG = "bear-and-berry"

export function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

export function joinScopePath(parts: readonly string[]): string {
	const segments = parts.map(slugify).filter((part) => part.length > 0)
	if (segments.length === 0) {
		return GLOBAL_SCOPE
	}
	return `/${segments.join("/")}`
}

export function isVendforgeLabs(user: Pick<SessionUser, "orgSlug">): boolean {
	return user.orgSlug === VENDFORGE_LABS_SLUG
}

export function canSeeResource(user: SessionUser, resourcePath: string): boolean {
	if (hasAllOrganizations(user) || hasOrgWildcard(user.grants)) {
		return true
	}
	const slug = orgSlugFromPath(resourcePath)
	if (!slug) {
		return true
	}
	return user.accessibleOrgs.some((org) => org.slug === slug) || user.orgSlug === slug
}

export function scopedFilter<T extends { path: string }>(user: SessionUser, items: T[]): T[] {
	return items.filter((item) => canSeeResource(user, item.path))
}
