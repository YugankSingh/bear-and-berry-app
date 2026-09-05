import { z } from "zod"
import { ROLES } from "@/types/domain"

export const userCreateSchema = z.object({
	name: z.string().trim().min(2).max(80),
	email: z.string().trim().email(),
	password: z.string().min(8).max(128),
	role: z.enum(ROLES),
	organization: z.string().trim().max(120).optional(),
})

export const userPatchSchema = z.object({
	name: z.string().trim().min(2).max(80).optional(),
	role: z.enum(ROLES).optional(),
	organization: z.string().trim().max(120).nullable().optional(),
	isActive: z.boolean().optional(),
	password: z.string().min(8).max(128).optional(),
})

export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserPatchInput = z.infer<typeof userPatchSchema>
