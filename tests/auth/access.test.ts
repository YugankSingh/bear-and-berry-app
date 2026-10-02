import { describe, expect, it } from "vitest"
import {
	hasDashboardAccess,
	isUserLive,
	isUserRemoved,
	resolveAccessStatus,
	resolveInviteState,
} from "@/lib/auth/access"
import { nextAuthStep } from "@/lib/auth/lookup"
import type { UserDocument } from "@/lib/db/documents"
import { ObjectId } from "mongodb"

function userDoc(overrides: Partial<UserDocument> = {}): UserDocument {
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

describe("access status", () => {
	it("only invited status gets dashboard access", () => {
		expect(hasDashboardAccess("invited")).toBe(true)
		expect(hasDashboardAccess("waitlisted")).toBe(false)
		expect(hasDashboardAccess("pending_invite")).toBe(false)
		expect(resolveAccessStatus("wat")).toBe("invited")
	})

	it("treats soft-deleted and inactive users as not live", () => {
		expect(isUserRemoved(userDoc({ deletedAt: new Date() }))).toBe(true)
		expect(isUserLive(userDoc({ isActive: false }))).toBe(false)
		expect(isUserLive(userDoc({ deletedAt: new Date() }))).toBe(false)
		expect(isUserLive(null)).toBe(false)
		expect(isUserLive(userDoc())).toBe(true)
	})

	it("resolves invite pending and expired states", () => {
		expect(
			resolveInviteState({
				inviteTokenHash: "x",
				inviteExpiresAt: new Date(Date.now() + 60_000),
			}),
		).toBe("pending")
		expect(
			resolveInviteState({
				inviteTokenHash: "x",
				inviteExpiresAt: new Date(Date.now() - 1),
			}),
		).toBe("expired")
		expect(resolveInviteState({ inviteAcceptedAt: new Date() })).toBe("accepted")
	})
})

describe("nextAuthStep", () => {
	it("routes unknown emails to signup", () => {
		expect(nextAuthStep(null)).toBe("signup")
	})

	it("routes removed users to removed", () => {
		expect(nextAuthStep(userDoc({ deletedAt: new Date() }))).toBe("removed")
	})

	it("routes pending and expired invites", () => {
		expect(
			nextAuthStep(
				userDoc({
					inviteTokenHash: "x",
					inviteExpiresAt: new Date(Date.now() + 60_000),
				}),
			),
		).toBe("invite_pending")
		expect(
			nextAuthStep(
				userDoc({
					inviteTokenHash: "x",
					inviteExpiresAt: new Date(Date.now() - 1),
				}),
			),
		).toBe("invite_expired")
	})

	it("routes waitlisted unverified users to verify", () => {
		expect(
			nextAuthStep(
				userDoc({
					accessStatus: "waitlisted",
					emailVerified: false,
				}),
			),
		).toBe("verify")
	})

	it("routes verified waitlisted and invited users to login", () => {
		expect(
			nextAuthStep(
				userDoc({
					accessStatus: "waitlisted",
					emailVerified: true,
				}),
			),
		).toBe("login")
		expect(nextAuthStep(userDoc({ accessStatus: "invited" }))).toBe("login")
	})
})
