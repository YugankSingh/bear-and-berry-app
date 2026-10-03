import { describe, expect, it } from "vitest"
import { nextAuthStep } from "@/lib/auth/lookup"
import { authorizeLogin } from "@/lib/auth/login-gate"
import { authorizeVerifyOtp } from "@/lib/auth/verify-otp-gate"
import { shouldResendOtp } from "@/lib/auth/resend-otp-gate"
import { authorizeAcceptInvite } from "@/lib/auth/accept-invite-gate"
import { authorizeInviteLookup } from "@/lib/auth/invite-lookup-gate"
import { authorizeUserPatch } from "@/lib/auth/user-patch-auth"
import { hasDashboardAccess } from "@/lib/auth/access"
import { ObjectId } from "mongodb"
import type { UserDocument } from "@/lib/db/documents"
import { sessionUser } from "../helpers/auth"

function doc(overrides: Partial<UserDocument> = {}): UserDocument {
	return {
		_id: new ObjectId(),
		name: "Test",
		email: "test@example.com",
		passwordHash: "hash",
		role: "viewer",
		orgId: new ObjectId(),
		orgSlug: "bear-and-berry",
		organization: "Bear & Berry",
		scopePath: "/bear-and-berry",
		tags: [],
		isActive: true,
		accessStatus: "invited",
		resourceAccess: {
			mode: "all",
			organizationSlugs: [],
			organizationTags: [],
			locationIds: [],
			machineIds: [],
			machineTags: [],
		},
		memberships: [],
		extraPermissions: [],
		emailVerified: true,
		passwordReady: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	}
}

/**
 * End-to-end decision tables for every auth surface without hitting Mongo.
 * Each row is a persona × action expectation.
 */
describe("auth decision tables — every persona × action", () => {
	const personas = {
		unknown: null,
		removed: doc({ deletedAt: new Date() }),
		inactive: doc({ isActive: false }),
		waitlistedUnverified: doc({
			accessStatus: "waitlisted",
			emailVerified: false,
		}),
		waitlistedVerified: doc({
			accessStatus: "waitlisted",
			emailVerified: true,
		}),
		invitePending: doc({
			accessStatus: "pending_invite",
			inviteTokenHash: "tok",
			inviteExpiresAt: new Date(Date.now() + 60_000),
			passwordReady: true,
			emailVerified: false,
		}),
		invitePendingNeedsPassword: doc({
			accessStatus: "pending_invite",
			inviteTokenHash: "tok",
			inviteExpiresAt: new Date(Date.now() + 60_000),
			passwordReady: false,
			emailVerified: false,
		}),
		inviteExpired: doc({
			accessStatus: "pending_invite",
			inviteTokenHash: "tok",
			inviteExpiresAt: new Date(Date.now() - 1),
			passwordReady: true,
		}),
		inviteAccepted: doc({
			accessStatus: "invited",
			inviteAcceptedAt: new Date(),
			emailVerified: true,
			passwordReady: true,
		}),
		liveInvited: doc({
			accessStatus: "invited",
			emailVerified: true,
			passwordReady: true,
		}),
		invitedNoPassword: doc({
			accessStatus: "invited",
			emailVerified: true,
			passwordReady: false,
		}),
	} as const

	it("lookup next step for every persona", () => {
		expect(nextAuthStep(personas.unknown)).toBe("signup")
		expect(nextAuthStep(personas.removed)).toBe("removed")
		expect(nextAuthStep(personas.invitePending)).toBe("invite_pending")
		expect(nextAuthStep(personas.inviteExpired)).toBe("invite_expired")
		expect(nextAuthStep(personas.waitlistedUnverified)).toBe("verify")
		expect(nextAuthStep(personas.waitlistedVerified)).toBe("login")
		expect(nextAuthStep(personas.liveInvited)).toBe("login")
		expect(nextAuthStep(personas.inviteAccepted)).toBe("login")
		expect(nextAuthStep(personas.inactive)).toBe("login") // inactive still "exists"; login gate blocks
	})

	it("login gate for every persona", () => {
		expect(authorizeLogin(personas.unknown).ok).toBe(false)
		expect(authorizeLogin(personas.removed).ok).toBe(false)
		expect(authorizeLogin(personas.inactive).ok).toBe(false)
		expect(authorizeLogin(personas.invitePending).ok).toBe(false)
		expect(authorizeLogin(personas.inviteExpired).ok).toBe(false)
		expect(authorizeLogin(personas.waitlistedUnverified).ok).toBe(false)
		expect(authorizeLogin(personas.waitlistedVerified).ok).toBe(true)
		expect(authorizeLogin(personas.liveInvited).ok).toBe(true)
		expect(authorizeLogin(personas.invitedNoPassword).ok).toBe(false)
		expect(authorizeLogin(personas.inviteAccepted).ok).toBe(true)
	})

	it("dashboard access after login for every accessStatus", () => {
		expect(hasDashboardAccess("waitlisted")).toBe(false)
		expect(hasDashboardAccess("pending_invite")).toBe(false)
		expect(hasDashboardAccess("invited")).toBe(true)
		expect(hasDashboardAccess(personas.waitlistedVerified.accessStatus)).toBe(false)
		expect(hasDashboardAccess(personas.liveInvited.accessStatus)).toBe(true)
	})

	it("verify-otp gate for every persona", () => {
		const verify = (otp: string, hash?: string | null) => otp === "123456" && hash === "ok"
		const future = new Date(Date.now() + 60_000)

		expect(
			authorizeVerifyOtp(
				{ emailVerified: true, emailOtpExpiresAt: future, emailOtpHash: "ok" },
				"123456",
				verify,
			).ok,
		).toBe(false)

		expect(
			authorizeVerifyOtp(
				{ emailVerified: false, emailOtpExpiresAt: future, emailOtpHash: "ok" },
				"123456",
				verify,
			).ok,
		).toBe(true)

		expect(
			authorizeVerifyOtp(
				{ emailVerified: false, emailOtpExpiresAt: future, emailOtpHash: "ok" },
				"000000",
				verify,
			).ok,
		).toBe(false)

		expect(
			authorizeVerifyOtp(
				{ emailVerified: false, emailOtpExpiresAt: new Date(Date.now() - 1), emailOtpHash: "ok" },
				"123456",
				verify,
			).ok,
		).toBe(false)
	})

	it("resend-otp for every persona", () => {
		expect(shouldResendOtp(personas.unknown)).toBe(false)
		expect(shouldResendOtp(personas.removed)).toBe(false)
		expect(shouldResendOtp(personas.inactive)).toBe(false)
		expect(shouldResendOtp(personas.waitlistedUnverified)).toBe(true)
		expect(shouldResendOtp(personas.waitlistedVerified)).toBe(false)
		expect(shouldResendOtp(personas.liveInvited)).toBe(false)
	})

	it("invite lookup / accept for every invite persona", () => {
		expect(authorizeInviteLookup(personas.unknown).ok).toBe(false)
		expect(authorizeInviteLookup(personas.invitePending).ok).toBe(true)
		expect(authorizeInviteLookup(personas.inviteExpired).ok).toBe(false)
		expect(authorizeInviteLookup(personas.inviteAccepted).ok).toBe(false)
		expect(authorizeInviteLookup(personas.liveInvited).ok).toBe(false)

		expect(authorizeAcceptInvite(personas.invitePending, false).ok).toBe(true)
		expect(authorizeAcceptInvite(personas.invitePendingNeedsPassword, false).ok).toBe(false)
		expect(authorizeAcceptInvite(personas.invitePendingNeedsPassword, true).ok).toBe(true)
		expect(authorizeAcceptInvite(personas.inviteExpired, true).ok).toBe(false)
		expect(authorizeAcceptInvite(personas.inviteAccepted, true).ok).toBe(false)
	})

	it("user patch auth for every permission combo", () => {
		const cases: Array<{
			perms: string[]
			body: Record<string, unknown>
			ok: boolean
		}> = [
			{ perms: [], body: { name: "A" }, ok: false },
			{ perms: ["users:read"], body: { name: "A" }, ok: false },
			{ perms: ["users:write"], body: { name: "A" }, ok: true },
			{ perms: ["users:write"], body: { extraGrants: [] }, ok: false },
			{ perms: ["users:write"], body: { name: "A", extraGrants: [] }, ok: false },
			{ perms: ["users:grant"], body: { extraGrants: [] }, ok: true },
			{ perms: ["users:grant"], body: { name: "A" }, ok: false },
			{
				perms: ["users:write", "users:grant"],
				body: { name: "A", extraGrants: [] },
				ok: true,
			},
			{ perms: ["system:admin"], body: { name: "A", extraGrants: [] }, ok: true },
		]

		for (const row of cases) {
			const result = authorizeUserPatch(sessionUser({ permissions: row.perms as never, grants: [] }), row.body)
			expect(result.ok, JSON.stringify(row)).toBe(row.ok)
		}
	})
})
