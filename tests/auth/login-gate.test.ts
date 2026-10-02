import { describe, expect, it } from "vitest"
import { authorizeLogin } from "@/lib/auth/login-gate"

describe("authorizeLogin — every outcome", () => {
	it("rejects missing user", () => {
		expect(authorizeLogin(null)).toEqual({
			ok: false,
			status: 401,
			error: "Those credentials do not match our records.",
		})
		expect(authorizeLogin(undefined).ok).toBe(false)
	})

	it("rejects soft-deleted user", () => {
		expect(authorizeLogin({ deletedAt: new Date(), accessStatus: "invited" }).status).toBe(401)
	})

	it("rejects inactive user", () => {
		expect(authorizeLogin({ isActive: false, accessStatus: "invited" }).status).toBe(401)
	})

	it("rejects pending invite", () => {
		const result = authorizeLogin({
			accessStatus: "pending_invite",
			inviteTokenHash: "hash",
			inviteExpiresAt: new Date(Date.now() + 60_000),
			passwordReady: true,
			emailVerified: true,
		})
		expect(result).toEqual({
			ok: false,
			status: 403,
			error: "Check your email for the invitation link before signing in.",
		})
	})

	it("rejects expired invite", () => {
		const result = authorizeLogin({
			accessStatus: "pending_invite",
			inviteTokenHash: "hash",
			inviteExpiresAt: new Date(Date.now() - 1),
			passwordReady: true,
			emailVerified: true,
		})
		expect(result).toEqual({
			ok: false,
			status: 403,
			error: "Your invitation expired. Ask an admin to send a new one.",
		})
	})

	it("rejects passwordReady === false", () => {
		const result = authorizeLogin({
			accessStatus: "invited",
			passwordReady: false,
			emailVerified: true,
		})
		expect(result).toEqual({
			ok: false,
			status: 403,
			error: "This account is waiting for you to set a password from the invite email.",
		})
	})

	it("rejects waitlisted + unverified", () => {
		const result = authorizeLogin({
			accessStatus: "waitlisted",
			passwordReady: true,
			emailVerified: false,
		})
		expect(result).toEqual({
			ok: false,
			status: 403,
			error: "Verify your email with the code we sent before signing in.",
		})
	})

	it("allows waitlisted + verified (session ok; middleware keeps them on waitlist)", () => {
		expect(
			authorizeLogin({
				accessStatus: "waitlisted",
				passwordReady: true,
				emailVerified: true,
			}),
		).toEqual({ ok: true })
	})

	it("allows invited + verified + password ready", () => {
		expect(
			authorizeLogin({
				accessStatus: "invited",
				passwordReady: true,
				emailVerified: true,
			}),
		).toEqual({ ok: true })
	})

	it("allows invited when passwordReady is undefined (legacy)", () => {
		expect(
			authorizeLogin({
				accessStatus: "invited",
				emailVerified: true,
			}),
		).toEqual({ ok: true })
	})

	it("allows after invite accepted even if token fields linger empty", () => {
		expect(
			authorizeLogin({
				accessStatus: "invited",
				inviteAcceptedAt: new Date(),
				passwordReady: true,
				emailVerified: true,
			}),
		).toEqual({ ok: true })
	})
})
