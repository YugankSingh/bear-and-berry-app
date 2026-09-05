import { NextResponse } from "next/server"
import { findPublishedBlogBySlug } from "@/lib/repositories/blogs"
import { ensureDatabaseReady } from "@/lib/seed"
import { fail, ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"
import { withCors } from "@/lib/api/cors"

type RouteContext = {
	params: Promise<{ slug: string }>
}

export function OPTIONS(request: Request) {
	return new NextResponse(null, { status: 204, headers: withCors(request) })
}

export async function GET(request: Request, context: RouteContext) {
	try {
		await ensureDatabaseReady()
		const { slug } = await context.params
		const post = await findPublishedBlogBySlug(slug)
		if (!post) {
			return fail("NOT_FOUND", "Post not found.", 404, withCors(request))
		}
		return ok({ post }, 200, withCors(request))
	} catch (error) {
		return handleApiError(error, request)
	}
}