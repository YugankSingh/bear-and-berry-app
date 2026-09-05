export const BLOG_STATUSES = ["draft", "published"] as const
export type BlogStatus = (typeof BLOG_STATUSES)[number]

export type BlogParagraphBlock = {
	type: "p"
	text: string
}

export type BlogHeadingBlock = {
	type: "h2"
	text: string
}

export type BlogListBlock = {
	type: "list"
	items: string[]
}

export type BlogContentBlock = BlogParagraphBlock | BlogHeadingBlock | BlogListBlock

export type BlogPostRecord = {
	id: string
	slug: string
	title: string
	description: string
	category: string
	readTime: string
	status: BlogStatus
	publishedAt: string | null
	content: BlogContentBlock[]
	authorName: string
	tags: string[]
	createdAt: string
	updatedAt: string
}

export type PublicBlogPost = Omit<BlogPostRecord, "status" | "id" | "createdAt" | "updatedAt" | "tags"> & {
	publishedAt: string
}
