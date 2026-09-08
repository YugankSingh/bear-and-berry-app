export const BLOG_STATUSES = ["draft", "published"] as const
export type BlogStatus = (typeof BLOG_STATUSES)[number]

export type BlogPostRecord = {
	id: string
	slug: string
	title: string
	description: string
	metaTitle: string
	metaDescription: string
	category: string
	readTime: string
	status: BlogStatus
	publishedAt: string | null
	content: string
	authorName: string
	tags: string[]
	createdAt: string
	updatedAt: string
}

export type PublicBlogPost = Omit<BlogPostRecord, "status" | "id" | "createdAt" | "updatedAt" | "tags"> & {
	publishedAt: string
}
