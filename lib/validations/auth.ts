import { z } from "zod"

export const emailLookupSchema = z.object({
	email: z.string().trim().email(),
})

export const loginSchema = z.object({
	email: z.string().trim().email(),
	password: z.string().min(8).max(128),
})

export const signupSchema = z.object({
	name: z.string().trim().min(2).max(80),
	email: z.string().trim().email(),
	password: z.string().min(8).max(128),
})

export const verifyOtpSchema = z.object({
	email: z.string().trim().email(),
	otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
})

export const acceptInviteSchema = z.object({
	token: z.string().trim().min(16),
	password: z.string().min(8).max(128).optional(),
})

export const resendOtpSchema = z.object({
	email: z.string().trim().email(),
})

export type EmailLookupInput = z.infer<typeof emailLookupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>

