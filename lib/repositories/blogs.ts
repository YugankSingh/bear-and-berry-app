import { ObjectId } from "mongodb"
import { blogPostsCollection } from "@/lib/db/collections"
import { mapBlogPost } from "@/lib/db/mappers"
import type { BlogPostDocument } from "@/lib/db/documents"
import type { BlogContentBlock, BlogPostRecord, BlogStatus, PublicBlogPost } from "@/types/cms"

export type BlogWriteInput = {
	slug: string
	title: string
	description: string
	category: string
	readTime: string
	status: BlogStatus
	content: BlogContentBlock[]
	authorName: string
	tags?: string[]
}

function toPublic(post: BlogPostRecord): PublicBlogPost | null {
	if (post.status !== "published" || !post.publishedAt) {
		return null
	}
	return {
		slug: post.slug,
		title: post.title,
		description: post.description,
		category: post.category,
		readTime: post.readTime,
		publishedAt: post.publishedAt,
		content: post.content,
		authorName: post.authorName,
	}
}

export async function listBlogPosts(): Promise<BlogPostRecord[]> {
	const blogs = await blogPostsCollection()
	const docs = await blogs.find({}).sort({ updatedAt: -1 }).toArray()
	return docs.map(mapBlogPost)
}

export async function listPublishedBlogPosts(): Promise<PublicBlogPost[]> {
	const blogs = await blogPostsCollection()
	const docs = await blogs
		.find({ status: "published" })
		.sort({ publishedAt: -1 })
		.toArray()
	return docs.map(mapBlogPost).flatMap((post) => {
		const pub = toPublic(post)
		return pub ? [pub] : []
	})
}

export async function findBlogBySlug(slug: string): Promise<BlogPostRecord | null> {
	const blogs = await blogPostsCollection()
	const doc = await blogs.findOne({ slug })
	return doc ? mapBlogPost(doc) : null
}

export async function findPublishedBlogBySlug(slug: string): Promise<PublicBlogPost | null> {
	const post = await findBlogBySlug(slug)
	return post ? toPublic(post) : null
}

export async function createBlogPost(input: BlogWriteInput): Promise<BlogPostRecord> {
	const blogs = await blogPostsCollection()
	const now = new Date()
	const doc: Omit<BlogPostDocument, "_id"> = {
		slug: input.slug,
		title: input.title,
		description: input.description,
		category: input.category,
		readTime: input.readTime,
		status: input.status,
		publishedAt: input.status === "published" ? now : null,
		content: input.content,
		authorName: input.authorName,
		tags: input.tags ?? [],
		createdAt: now,
		updatedAt: now,
	}
	const result = await blogs.insertOne(doc as BlogPostDocument)
	return mapBlogPost({ ...doc, _id: result.insertedId })
}

export async function updateBlogPost(
	id: string,
	input: Partial<BlogWriteInput>,
): Promise<BlogPostRecord | null> {
	if (!ObjectId.isValid(id)) {
		return null
	}
	const blogs = await blogPostsCollection()
	const current = await blogs.findOne({ _id: new ObjectId(id) })
	if (!current) {
		return null
	}

	const nextStatus = input.status ?? current.status
	const $set: Partial<BlogPostDocument> = {
		updatedAt: new Date(),
	}
	if (input.slug !== undefined) $set.slug = input.slug
	if (input.title !== undefined) $set.title = input.title
	if (input.description !== undefined) $set.description = input.description
	if (input.category !== undefined) $set.category = input.category
	if (input.readTime !== undefined) $set.readTime = input.readTime
	if (input.content !== undefined) $set.content = input.content
	if (input.authorName !== undefined) $set.authorName = input.authorName
	if (input.tags !== undefined) $set.tags = input.tags
	if (input.status !== undefined) $set.status = input.status
	if (nextStatus === "published" && !current.publishedAt) {
		$set.publishedAt = new Date()
	}

	const result = await blogs.findOneAndUpdate(
		{ _id: new ObjectId(id) },
		{ $set },
		{ returnDocument: "after" },
	)
	return result ? mapBlogPost(result) : null
}

export async function deleteBlogPost(id: string): Promise<boolean> {
	if (!ObjectId.isValid(id)) {
		return false
	}
	const blogs = await blogPostsCollection()
	const result = await blogs.deleteOne({ _id: new ObjectId(id) })
	return result.deletedCount === 1
}

export async function countBlogPosts(): Promise<number> {
	const blogs = await blogPostsCollection()
	return blogs.countDocuments()
}