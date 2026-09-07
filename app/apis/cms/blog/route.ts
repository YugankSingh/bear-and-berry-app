import { blogWriteSchema } from "@/lib/validations/blog"
import { createBlogPost, listBlogPosts } from "@/lib/repositories/blogs"
import { revalidateLandingBlog } from "@/lib/cms/revalidate-landing"
import { requireVendforgeCms } from "@/lib/auth/require-auth"
import { ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function GET() {
	try {
		await requireVendforgeCms("cms:read")
		const posts = await listBlogPosts()
		return ok({ posts })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function POST(request: Request) {
	try {
		const user = await requireVendforgeCms("cms:write")
		const body = blogWriteSchema.parse(await readJson(request))
		const post = await createBlogPost({
			...body,
			authorName: body.authorName ?? user.name,
		})
		if (post.status === "published") {
			await revalidateLandingBlog([post.slug])
		}
		return ok({ post }, 201)
	} catch (error) {
		return handleApiError(error)
	}
}