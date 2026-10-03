/** Shared Mongo filter helpers for repository list methods. */

export function orgSlugInFilter(orgSlugs?: string[]): { orgSlug: { $in: string[] } } | Record<string, never> {
	if (!orgSlugs || orgSlugs.length === 0) {
		return {}
	}
	return { orgSlug: { $in: orgSlugs } }
}
