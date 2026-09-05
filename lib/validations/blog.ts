import { z } from "zod"
import { BLOG_STATUSES } from "@/types/cms"

const blockSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("p"), text: z.string().trim().min(1) }),
	z.object({ type: z.literal("h2"), text: z.string().trim().min(1) }),
	z.object({
		type: z.literal("list"),
		items: z.array(z.string().trim().min(1)).min(1),
	}),
])

export const blogWriteSchema = z.object({
	slug: z
		.string()
		.trim()
		.min(3)
		.max(120)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	title: z.string().trim().min(4).max(160),
	description: z.string().trim().min(8).max(280),
	category: z.string().trim().min(2).max(40),
	readTime: z.string().trim().min(3).max(24),
	status: z.enum(BLOG_STATUSES),
	content: z.array(blockSchema).min(1),
	authorName: z.string().trim().min(2).max(80).optional(),
	tags: z.array(z.string().trim().min(1).max(40)).optional(),
})

export const blogPatchSchema = blogWriteSchema.partial()

export type BlogWriteInput = z.infer<typeof blogWriteSchema>
export type BlogPatchInput = z.infer<typeof blogPatchSchema>