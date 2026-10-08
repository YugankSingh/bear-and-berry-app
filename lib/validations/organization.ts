import { z } from "zod"
import { ORG_KINDS } from "@/types/domain"

export const tagSchema = z
	.string()
	.trim()
	.min(1, "Tag is required.")
	.max(40, "Tag is too long.")
	.regex(/^[a-zA-Z0-9_-]+$/, "Tags can only use letters, numbers, hyphens, and underscores.")

const RESERVED_ORG_SLUGS = new Set(["admin", "organization", "new"])

export const organizationSlugSchema = z
	.string()
	.trim()
	.min(2, "Slug must be at least 2 characters.")
	.max(60, "Slug is too long.")
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug can only use lowercase letters, numbers, and single hyphens.")
	.refine((value) => !RESERVED_ORG_SLUGS.has(value), "That slug is reserved.")

export const organizationCreateSchema = z.object({
	name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
	slug: organizationSlugSchema,
	kind: z.enum(ORG_KINDS).default("partner"),
	tags: z.array(tagSchema).max(40).optional(),
})

export const organizationTagSchema = z.object({
	tag: tagSchema,
	/** Must be true to add a tag that is not in the catalog yet; guards against typos creating tags. */
	create: z.boolean().optional(),
})

export const tagCatalogCreateSchema = z.object({
	tag: tagSchema,
})

/** Tags are changed one at a time through the tag routes so each change is permission-checked. */
export const organizationPatchSchema = z
	.object({
		name: z.string().trim().min(2).max(120).optional(),
		kind: z.enum(ORG_KINDS).optional(),
	})
	.refine((value) => value.name !== undefined || value.kind !== undefined, {
		message: "Provide at least one field to update.",
	})

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>
export type OrganizationTagInput = z.infer<typeof organizationTagSchema>
export type OrganizationPatchInput = z.infer<typeof organizationPatchSchema>
