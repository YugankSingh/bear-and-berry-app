import { NextResponse } from "next/server"
import { listPublishedBlogPosts } from "@/lib/repositories/blogs"
import { ensureDatabaseReady } from "@/lib/seed"
import { ok } from "@/lib/api/response"
import { handleApiError } from "@/lib/api/guard"
import { withCors } from "@/lib/api/cors"

export function OPTIONS(request: Request) {
	return new NextResponse(null, { status: 204, headers: withCors(request) })
}

export async function GET(request: Request) {
	try {
		await ensureDatabaseReady()
		const posts = await listPublishedBlogPosts()
		return ok({ posts }, 200, withCors(request))
	} catch (error) {
		return handleApiError(error, request)
	}
}