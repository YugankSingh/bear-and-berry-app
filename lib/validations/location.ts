import { z } from "zod"
import { SITE_TYPES } from "@/types/domain"

export const locationCreateSchema = z.object({
	name: z.string().trim().min(2).max(120),
	city: z.string().trim().min(2).max(80),
	region: z.string().trim().min(2).max(80),
	orgSlug: z.string().trim().min(2).max(80).default("bear-and-berry"),
	address: z.string().trim().max(200).optional(),
	siteType: z.enum(SITE_TYPES),
	footfallDaily: z.number().int().min(0).optional(),
	tags: z.array(z.string().trim().min(1).max(40)).optional(),
})

export const locationPatchSchema = locationCreateSchema.partial()

export type LocationCreateInput = z.infer<typeof locationCreateSchema>
export type LocationPatchInput = z.infer<typeof locationPatchSchema>