import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ObjectId } from "mongodb"
import { PageShell } from "@/components/layout/page-shell"
import { BlogEditor } from "@/components/cms/blog-editor"
import { requireVendforgeCms } from "@/lib/auth/require-auth"
import { blogPostsCollection } from "@/lib/db/collections"
import { mapBlogPost } from "@/lib/db/mappers"

export const metadata: Metadata = {
	title: "Edit blog post",
}

type EditBlogPageProps = {
	params: Promise<{ id: string }>
}

export default async function EditBlogPostPage({ params }: EditBlogPageProps) {
	await requireVendforgeCms("cms:write")
	const { id } = await params
	if (!ObjectId.isValid(id)) {
		notFound()
	}
	const blogs = await blogPostsCollection()
	const doc = await blogs.findOne({ _id: new ObjectId(id) })
	if (!doc) {
		notFound()
	}

	return (
		<PageShell
			title="Edit post"
			subtitle="Updates go live on the landing page after the next ISR refresh."
			permission="cms:write"
		>
			<BlogEditor post={mapBlogPost(doc)} />
		</PageShell>
	)
}
