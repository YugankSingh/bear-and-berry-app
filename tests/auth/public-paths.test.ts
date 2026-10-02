import { describe, expect, it } from "vitest"
import { isPublicPath, isWaitlistAllowedApi } from "@/lib/auth/public-paths"

describe("public path gate", () => {
	it("allows auth entrypoints without a session", () => {
		expect(isPublicPath("/login")).toBe(true)
		expect(isPublicPath("/apis/auth/login")).toBe(true)
		expect(isPublicPath("/apis/auth/lookup")).toBe(true)
		expect(isPublicPath("/apis/auth/signup")).toBe(true)
		expect(isPublicPath("/apis/auth/verify-otp")).toBe(true)
		expect(isPublicPath("/apis/auth/resend-otp")).toBe(true)
		expect(isPublicPath("/apis/auth/accept-invite")).toBe(true)
		expect(isPublicPath("/apis/auth/invite/token")).toBe(true)
		expect(isPublicPath("/apis/auth/logout")).toBe(true)
		expect(isPublicPath("/apis/public/blog")).toBe(true)
		expect(isPublicPath("/apis/health")).toBe(true)
	})

	it("does not treat authenticated APIs as public", () => {
		expect(isPublicPath("/apis/auth/me")).toBe(false)
		expect(isPublicPath("/apis/auth/workspace")).toBe(false)
		expect(isPublicPath("/apis/users")).toBe(false)
		expect(isPublicPath("/apis/machines")).toBe(false)
		expect(isPublicPath("/apis/organizations")).toBe(false)
		expect(isPublicPath("/apis/organizations/tags")).toBe(false)
		expect(isPublicPath("/overview")).toBe(false)
		expect(isPublicPath("/admin")).toBe(false)
	})

	it("prefixes /apis/leads as public at the middleware layer", () => {
		expect(isPublicPath("/apis/leads")).toBe(true)
		expect(isPublicPath("/apis/leads/recipients")).toBe(true)
	})

	it("only allows logout and me for waitlisted API access", () => {
		expect(isWaitlistAllowedApi("/apis/auth/me")).toBe(true)
		expect(isWaitlistAllowedApi("/apis/auth/logout")).toBe(true)
		expect(isWaitlistAllowedApi("/apis/auth/workspace")).toBe(false)
		expect(isWaitlistAllowedApi("/apis/users")).toBe(false)
		expect(isWaitlistAllowedApi("/apis/leads")).toBe(false)
	})
})
