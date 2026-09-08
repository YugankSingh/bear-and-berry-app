import { z } from "zod"
import { BLOG_STATUSES } from "@/types/cms"

const blogFieldsSchema = z.object({
	slug: z
		.string()
		.trim()
		.min(3)
		.max(120)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	title: z.string().trim().min(4).max(160),
	description: z.string().trim().min(8).max(280),
	metaTitle: z.string().trim().min(4).max(160),
	metaDescription: z.string().trim().min(8).max(280),
	category: z.string().trim().min(2).max(40),
	status: z.enum(BLOG_STATUSES),
	content: z.string().trim().min(1).max(100_000),
	authorName: z.string().trim().min(2).max(80).optional(),
	tags: z.array(z.string().trim().min(1).max(40)).optional(),
})

export const blogWriteSchema = blogFieldsSchema
export const blogPatchSchema = blogFieldsSchema.partial()

export type BlogWriteInput = z.infer<typeof blogWriteSchema>
export type BlogPatchInput = z.infer<typeof blogPatchSchema>