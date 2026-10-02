import { describe, expect, it } from "vitest"
import { authorizeVerifyOtp } from "@/lib/auth/verify-otp-gate"

describe("authorizeVerifyOtp", () => {
	const verify = (otp: string, hash: string | null | undefined) => otp === "123456" && hash === "ok"

	it("refuses already-verified emails without issuing a session path", () => {
		const result = authorizeVerifyOtp(
			{ emailVerified: true, emailOtpExpiresAt: new Date(Date.now() + 60_000), emailOtpHash: "ok" },
			"123456",
			verify,
		)
		expect(result).toEqual({
			ok: false,
			status: 409,
			error: "This email is already verified. Sign in instead.",
		})
	})

	it("rejects expired codes", () => {
		const result = authorizeVerifyOtp(
			{ emailVerified: false, emailOtpExpiresAt: new Date(Date.now() - 1), emailOtpHash: "ok" },
			"123456",
			verify,
		)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.status).toBe(401)
		}
	})

	it("rejects wrong codes", () => {
		const result = authorizeVerifyOtp(
			{ emailVerified: false, emailOtpExpiresAt: new Date(Date.now() + 60_000), emailOtpHash: "ok" },
			"000000",
			verify,
		)
		expect(result).toEqual({
			ok: false,
			status: 401,
			error: "That code does not match.",
		})
	})

	it("accepts a valid unexpired code", () => {
		expect(
			authorizeVerifyOtp(
				{ emailVerified: false, emailOtpExpiresAt: new Date(Date.now() + 60_000), emailOtpHash: "ok" },
				"123456",
				verify,
			),
		).toEqual({ ok: true })
	})
})
