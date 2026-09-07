import { getEnv, isProductionLike } from "@/lib/env"

function uniqueSlugs(slugs: Array<string | null | undefined>): string[] {
	return [...new Set(slugs.filter((slug): slug is string => Boolean(slug && slug.length > 0)))]
}

export async function revalidateLandingBlog(
	slugs: Array<string | null | undefined>,
): Promise<void> {
	const env = getEnv()
	const siteUrl = env.LANDING_SITE_URL
	const secret = env.LANDING_REVALIDATE_SECRET
	const paths = uniqueSlugs(slugs)

	if (!siteUrl || !secret) {
		if (isProductionLike()) {
			console.warn("landing revalidate skipped: LANDING_SITE_URL or LANDING_REVALIDATE_SECRET is unset")
		}
		return
	}

	try {
		const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/revalidate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-revalidate-secret": secret,
			},
			body: JSON.stringify({ slugs: paths }),
		})
		if (!response.ok) {
			const detail = await response.text()
			console.error("landing revalidate failed", response.status, detail)
		}
	} catch (error) {
		console.error("landing revalidate error", error)
	}
}
