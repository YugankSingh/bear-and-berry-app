import { describe, expect, it } from "vitest"
import { PUBLIC_PATHS, WAITLIST_API_PATHS, isPublicPath, isWaitlistAllowedApi } from "@/lib/auth/public-paths"

const PROTECTED_PAGES = [
	"/",
	"/overview",
	"/machines",
	"/locations",
	"/inventory",
	"/revenue",
	"/team",
	"/settings",
	"/admin",
	"/admin/leads",
	"/admin/organizations",
	"/admin/team",
	"/admin/roles",
	"/admin/cms/blog",
	"/admin/developer",
	"/organization",
	"/organization/bear-and-berry/overview",
]

const PROTECTED_APIS = [
	"/apis/auth/me",
	"/apis/auth/workspace",
	"/apis/users",
	"/apis/users/abc",
	"/apis/users/abc/invite",
	"/apis/roles",
	"/apis/roles/admin",
	"/apis/permissions",
	"/apis/organizations",
	"/apis/organizations/tags",
	"/apis/organizations/bear-and-berry",
	"/apis/organizations/bear-and-berry/tags",
	"/apis/machines",
	"/apis/machines/abc",
	"/apis/locations",
	"/apis/locations/abc",
	"/apis/inventory",
	"/apis/inventory/abc",
	"/apis/cms/blog",
	"/apis/cms/blog/abc",
	"/apis/leads/recipients", // still public via /apis/leads prefix — covered separately
]

describe("public paths — exhaustive", () => {
	it("every PUBLIC_PATH entry and a nested child is public", () => {
		for (const path of PUBLIC_PATHS) {
			expect(isPublicPath(path)).toBe(true)
			expect(isPublicPath(`${path}/nested`)).toBe(true)
		}
	})

	it("static asset shortcuts are public", () => {
		expect(isPublicPath("/_next/static/chunk.js")).toBe(true)
		expect(isPublicPath("/favicon.ico")).toBe(true)
	})

	it("every protected page requires auth at middleware", () => {
		for (const path of PROTECTED_PAGES) {
			expect(isPublicPath(path), path).toBe(false)
		}
	})

	it("protected APIs that must not be public", () => {
		for (const path of PROTECTED_APIS) {
			if (path.startsWith("/apis/leads")) continue
			expect(isPublicPath(path), path).toBe(false)
		}
	})

	it("documents that /apis/leads prefix opens all lead subroutes at middleware", () => {
		expect(isPublicPath("/apis/leads")).toBe(true)
		expect(isPublicPath("/apis/leads/notify")).toBe(true)
		expect(isPublicPath("/apis/leads/recipients")).toBe(true)
		expect(isPublicPath("/apis/leads/abc")).toBe(true)
		expect(isPublicPath("/apis/leads/abc/comments")).toBe(true)
	})

	it("waitlist allowlist is exactly logout + me", () => {
		expect([...WAITLIST_API_PATHS].sort()).toEqual(["/apis/auth/logout", "/apis/auth/me"].sort())
		for (const path of WAITLIST_API_PATHS) {
			expect(isWaitlistAllowedApi(path)).toBe(true)
			expect(isWaitlistAllowedApi(`${path}/extra`)).toBe(true)
		}
		expect(isWaitlistAllowedApi("/apis/auth/workspace")).toBe(false)
		expect(isWaitlistAllowedApi("/apis/auth/login")).toBe(false)
		expect(isWaitlistAllowedApi("/apis/users")).toBe(false)
		expect(isWaitlistAllowedApi("/apis/leads")).toBe(false)
		expect(isWaitlistAllowedApi("/apis/machines")).toBe(false)
	})
})
