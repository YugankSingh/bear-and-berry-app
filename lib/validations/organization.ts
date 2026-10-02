import { z } from "zod"
import { ORG_KINDS } from "@/types/domain"

const tagSchema = z
	.string()
	.trim()
	.min(1, "Tag is required.")
	.max(40, "Tag is too long.")
	.regex(/^[a-zA-Z0-9_-]+$/, "Tags can only use letters, numbers, hyphens, and underscores.")

export const organizationTagSchema = z.object({
	tag: tagSchema,
})

export const organizationTagsReplaceSchema = z.object({
	tags: z.array(tagSchema).max(40),
})

export const organizationPatchSchema = z
	.object({
		name: z.string().trim().min(2).max(120).optional(),
		kind: z.enum(ORG_KINDS).optional(),
		tags: z.array(tagSchema).max(40).optional(),
	})
	.refine((value) => value.name !== undefined || value.kind !== undefined || value.tags !== undefined, {
		message: "Provide at least one field to update.",
	})

export type OrganizationTagInput = z.infer<typeof organizationTagSchema>
export type OrganizationTagsReplaceInput = z.infer<typeof organizationTagsReplaceSchema>
export type OrganizationPatchInput = z.infer<typeof organizationPatchSchema>
