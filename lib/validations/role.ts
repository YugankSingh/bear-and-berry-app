import { z } from "zod"
import { PERMISSIONS } from "@/types/domain"

export const roleWriteSchema = z.object({
	slug: z
		.string()
		.trim()
		.min(2)
		.max(80)
		.regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores."),
	name: z.string().trim().min(2).max(80),
	description: z.string().trim().max(240).optional(),
	rank: z.number().int().min(1).max(1000),
	permissions: z.array(z.enum(PERMISSIONS)),
})

export const rolePatchSchema = z.object({
	name: z.string().trim().min(2).max(80).optional(),
	description: z.string().trim().max(240).optional(),
	rank: z.number().int().min(1).max(1000).optional(),
	permissions: z.array(z.enum(PERMISSIONS)).optional(),
})
