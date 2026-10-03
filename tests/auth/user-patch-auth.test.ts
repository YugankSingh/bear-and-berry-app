import { describe, expect, it } from "vitest"
import { authorizeUserPatch } from "@/lib/auth/user-patch-auth"
import { sessionUser } from "../helpers/auth"

describe("authorizeUserPatch", () => {
	it("allows users:write to edit name without extras", () => {
		const actor = sessionUser({ permissions: ["users:write"] })
		expect(authorizeUserPatch(actor, { name: "Pat" })).toEqual({ ok: true, extraOnly: false })
	})

	it("blocks users:write from adding extras without users:grant", () => {
		const actor = sessionUser({ permissions: ["users:write", "machines:read"] })
		const result = authorizeUserPatch(actor, {
			name: "Pat",
			extraGrants: [],
		})
		expect(result).toEqual({
			ok: false,
			status: 403,
			error: "You cannot grant extra permissions.",
		})
	})

	it("blocks extras-only patches without users:grant", () => {
		const actor = sessionUser({ permissions: ["users:write"] })
		expect(authorizeUserPatch(actor, { extraGrants: [] }).ok).toBe(false)
	})

	it("allows extras-only patches with users:grant", () => {
		const actor = sessionUser({ permissions: ["users:grant", "machines:read"] })
		expect(authorizeUserPatch(actor, { extraGrants: [] })).toEqual({
			ok: true,
			extraOnly: true,
		})
	})

	it("allows combined name+extras only with both write and grant", () => {
		const writeOnly = sessionUser({ permissions: ["users:write"] })
		expect(authorizeUserPatch(writeOnly, { name: "Pat", extraGrants: [] }).ok).toBe(false)

		const both = sessionUser({ permissions: ["users:write", "users:grant", "machines:read"] })
		expect(authorizeUserPatch(both, { name: "Pat", extraGrants: [] })).toEqual({
			ok: true,
			extraOnly: false,
		})
	})

	it("blocks actors with neither write nor grant", () => {
		const actor = sessionUser({ permissions: ["users:read"] })
		expect(authorizeUserPatch(actor, { name: "Pat" }).ok).toBe(false)
	})
})
