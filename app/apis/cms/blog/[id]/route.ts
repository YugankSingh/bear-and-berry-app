import { blogPatchSchema } from "@/lib/validations/blog"
import { deleteBlogPost, updateBlogPost } from "@/lib/repositories/blogs"
import { requireVendforgeCms } from "@/lib/auth/require-auth"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

type RouteContext = {
	params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		await requireVendforgeCms("cms:write")
		const { id } = await context.params
		const body = blogPatchSchema.parse(await readJson(request))
		const post = await updateBlogPost(id, body)
		if (!post) {
			return fail("NOT_FOUND", "Post not found.", 404)
		}
		return ok({ post })
	} catch (error) {
		return handleApiError(error)
	}
}

export async function DELETE(_request: Request, context: RouteContext) {
	try {
		await requireVendforgeCms("cms:write")
		const { id } = await context.params
		const deleted = await deleteBlogPost(id)
		if (!deleted) {
			return fail("NOT_FOUND", "Post not found.", 404)
		}
		return ok({ deleted: true })
	} catch (error) {
		return handleApiError(error)
	}
}