import { describe, expect, it } from "vitest"
import { authorizeAcceptInvite } from "@/lib/auth/accept-invite-gate"
import { authorizeInviteLookup } from "@/lib/auth/invite-lookup-gate"
import { shouldResendOtp } from "@/lib/auth/resend-otp-gate"

const pending = {
	inviteTokenHash: "hash",
	inviteExpiresAt: new Date(Date.now() + 60_000),
	passwordReady: true as boolean | false,
}

describe("authorizeInviteLookup — every outcome", () => {
	it("404 for missing / deleted / inactive", () => {
		expect(authorizeInviteLookup(null).status).toBe(404)
		expect(authorizeInviteLookup({ deletedAt: new Date() }).status).toBe(404)
		expect(authorizeInviteLookup({ isActive: false }).status).toBe(404)
	})

	it("401 for expired invite", () => {
		expect(
			authorizeInviteLookup({
				inviteTokenHash: "hash",
				inviteExpiresAt: new Date(Date.now() - 1),
			}),
		).toEqual({ ok: false, status: 401, error: "This invitation has expired." })
	})

	it("409 when invite already used / accepted / no pending token", () => {
		expect(
			authorizeInviteLookup({
				inviteAcceptedAt: new Date(),
				accessStatus: "invited",
			}).status,
		).toBe(409)
		expect(authorizeInviteLookup({ accessStatus: "invited" }).status).toBe(409)
		expect(authorizeInviteLookup({ accessStatus: "waitlisted" }).status).toBe(409)
	})

	it("ok for live pending invite", () => {
		expect(authorizeInviteLookup(pending)).toEqual({ ok: true })
	})
})

describe("authorizeAcceptInvite — every outcome", () => {
	it("404 for missing / deleted / inactive", () => {
		expect(authorizeAcceptInvite(null, false).status).toBe(404)
		expect(authorizeAcceptInvite({ deletedAt: new Date() }, true).status).toBe(404)
		expect(authorizeAcceptInvite({ isActive: false }, true).status).toBe(404)
	})

	it("401 for expired invite", () => {
		expect(
			authorizeAcceptInvite(
				{
					inviteTokenHash: "hash",
					inviteExpiresAt: new Date(Date.now() - 1),
					passwordReady: true,
				},
				true,
			).status,
		).toBe(401)
	})

	it("409 when invite already used", () => {
		expect(
			authorizeAcceptInvite(
				{
					inviteAcceptedAt: new Date(),
					accessStatus: "invited",
				},
				true,
			).status,
		).toBe(409)
	})

	it("400 when password required but missing", () => {
		expect(
			authorizeAcceptInvite({ ...pending, passwordReady: false }, false),
		).toEqual({
			ok: false,
			status: 400,
			error: "Choose a password to finish setting up your account.",
		})
	})

	it("ok when password required and provided", () => {
		expect(authorizeAcceptInvite({ ...pending, passwordReady: false }, true)).toEqual({ ok: true })
	})

	it("ok when password already ready and body omits password", () => {
		expect(authorizeAcceptInvite(pending, false)).toEqual({ ok: true })
	})
})

describe("shouldResendOtp — every outcome", () => {
	it("false for missing / deleted / inactive / verified", () => {
		expect(shouldResendOtp(null)).toBe(false)
		expect(shouldResendOtp({ deletedAt: new Date() })).toBe(false)
		expect(shouldResendOtp({ isActive: false })).toBe(false)
		expect(shouldResendOtp({ emailVerified: true })).toBe(false)
	})

	it("true for live unverified user", () => {
		expect(shouldResendOtp({ emailVerified: false })).toBe(true)
		expect(shouldResendOtp({})).toBe(true)
	})
})
