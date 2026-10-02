import { describe, expect, it } from "vitest"
import {
	emailLookupSchema,
	loginSchema,
	signupSchema,
	verifyOtpSchema,
	acceptInviteSchema,
	resendOtpSchema,
} from "@/lib/validations/auth"

describe("auth validation schemas — every rejection and acceptance", () => {
	describe("emailLookupSchema", () => {
		it.each(["", "nope", "a@", "@b.com", "a@b", " "])("rejects %j", (email) => {
			expect(emailLookupSchema.safeParse({ email }).success).toBe(false)
		})
		it("accepts valid email and trims", () => {
			expect(emailLookupSchema.parse({ email: "  A@B.com " }).email).toBe("A@B.com")
		})
	})

	describe("loginSchema", () => {
		it("rejects short password", () => {
			expect(loginSchema.safeParse({ email: "a@b.com", password: "1234567" }).success).toBe(false)
		})
		it("rejects oversized password", () => {
			expect(loginSchema.safeParse({ email: "a@b.com", password: "x".repeat(129) }).success).toBe(false)
		})
		it("rejects bad email", () => {
			expect(loginSchema.safeParse({ email: "bad", password: "12345678" }).success).toBe(false)
		})
		it("accepts boundary passwords 8 and 128", () => {
			expect(loginSchema.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(true)
			expect(loginSchema.safeParse({ email: "a@b.com", password: "x".repeat(128) }).success).toBe(true)
		})
	})

	describe("signupSchema", () => {
		it("rejects short name", () => {
			expect(signupSchema.safeParse({ name: "A", email: "a@b.com", password: "12345678" }).success).toBe(
				false,
			)
		})
		it("rejects long name", () => {
			expect(
				signupSchema.safeParse({ name: "x".repeat(81), email: "a@b.com", password: "12345678" }).success,
			).toBe(false)
		})
		it("accepts valid signup", () => {
			expect(
				signupSchema.safeParse({ name: "Ada", email: "ada@b.com", password: "12345678" }).success,
			).toBe(true)
		})
	})

	describe("verifyOtpSchema", () => {
		it.each(["12345", "1234567", "abcdef", "12 456", ""])("rejects otp %j", (otp) => {
			expect(verifyOtpSchema.safeParse({ email: "a@b.com", otp }).success).toBe(false)
		})
		it("accepts exactly 6 digits", () => {
			expect(verifyOtpSchema.safeParse({ email: "a@b.com", otp: "000000" }).success).toBe(true)
			expect(verifyOtpSchema.safeParse({ email: "a@b.com", otp: "999999" }).success).toBe(true)
		})
	})

	describe("acceptInviteSchema", () => {
		it("rejects short token", () => {
			expect(acceptInviteSchema.safeParse({ token: "short" }).success).toBe(false)
		})
		it("accepts token without password", () => {
			expect(acceptInviteSchema.safeParse({ token: "x".repeat(16) }).success).toBe(true)
		})
		it("rejects short optional password when present", () => {
			expect(
				acceptInviteSchema.safeParse({ token: "x".repeat(16), password: "short" }).success,
			).toBe(false)
		})
		it("accepts token with valid password", () => {
			expect(
				acceptInviteSchema.safeParse({ token: "x".repeat(16), password: "12345678" }).success,
			).toBe(true)
		})
	})

	describe("resendOtpSchema", () => {
		it("rejects invalid email", () => {
			expect(resendOtpSchema.safeParse({ email: "nope" }).success).toBe(false)
		})
		it("accepts valid email", () => {
			expect(resendOtpSchema.safeParse({ email: "a@b.com" }).success).toBe(true)
		})
	})
})
