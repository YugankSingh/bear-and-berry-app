import { z } from "zod"

export const leadRecipientCreateSchema = z.object({
	email: z.string().trim().email().max(160),
	tags: z.array(z.string().trim().min(1).max(40)).optional(),
})
