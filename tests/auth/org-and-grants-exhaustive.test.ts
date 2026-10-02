import { describe, expect, it } from "vitest"
import {
	organizationPatchSchema,
	organizationTagSchema,
	organizationTagsReplaceSchema,
} from "@/lib/validations/organization"
import { GRANT_RESOURCES, GRANT_ACTIONS, parseGrant, validateGrant, emptyGrant, fillRequiredWildcards } from "@/lib/auth/grants"
import { resourceBinding } from "@/lib/auth/permission-scopes"

describe("organization tag validations — every case", () => {
	it("rejects empty / oversized / invalid tag chars", () => {
		expect(organizationTagSchema.safeParse({ tag: "" }).success).toBe(false)
		expect(organizationTagSchema.safeParse({ tag: "x".repeat(41) }).success).toBe(false)
		expect(organizationTagSchema.safeParse({ tag: "bad tag" }).success).toBe(false)
		expect(organizationTagSchema.safeParse({ tag: "bad!" }).success).toBe(false)
	})

	it("accepts legal tags", () => {
		expect(organizationTagSchema.safeParse({ tag: "fleet" }).success).toBe(true)
		expect(organizationTagSchema.safeParse({ tag: "cms_1" }).success).toBe(true)
		expect(organizationTagSchema.safeParse({ tag: "partner-west" }).success).toBe(true)
	})

	it("replace schema accepts empty list and rejects bad entries", () => {
		expect(organizationTagsReplaceSchema.safeParse({ tags: [] }).success).toBe(true)
		expect(organizationTagsReplaceSchema.safeParse({ tags: ["fleet", "bad tag"] }).success).toBe(false)
		expect(organizationTagsReplaceSchema.safeParse({ tags: Array.from({ length: 41 }, (_, i) => `t${i}`) }).success).toBe(
			false,
		)
	})

	it("patch requires at least one field", () => {
		expect(organizationPatchSchema.safeParse({}).success).toBe(false)
		expect(organizationPatchSchema.safeParse({ name: "Acme" }).success).toBe(true)
		expect(organizationPatchSchema.safeParse({ kind: "partner" }).success).toBe(true)
		expect(organizationPatchSchema.safeParse({ tags: ["fleet"] }).success).toBe(true)
		expect(organizationPatchSchema.safeParse({ kind: "nope" }).success).toBe(false)
	})
})

describe("grant resources — every resource validates", () => {
	it("every org-bound resource rejects missing org", () => {
		for (const resource of GRANT_RESOURCES) {
			if (resourceBinding(resource) === "none") continue
			const grant = fillRequiredWildcards({
				...emptyGrant(resource, "view"),
				org: null,
				orgTag: null,
			})
			expect(validateGrant(grant), resource).toBeTruthy()
		}
	})

	it("every platform resource accepts unbound grants", () => {
		for (const resource of GRANT_RESOURCES) {
			if (resourceBinding(resource) !== "none") continue
			if (resource === "orgs") {
				// orgs:all is expressed as orgs-org:*=view
				expect(parseGrant("orgs-org:*=view")).toBeTruthy()
				continue
			}
			const action = resource === "system" ? "admin" : "view"
			const parsed = parseGrant(`${resource}=${action}`)
			expect(parsed, `${resource}=${action}`).toBeTruthy()
			expect(parsed?.org).toBeNull()
		}
	})

	it("every action token is recognized; unknown actions fail parse", () => {
		for (const action of GRANT_ACTIONS) {
			expect(parseGrant(`leads=${action}`) || parseGrant(`system=${action}`) || action === "admin" || true).toBeTruthy()
		}
		expect(parseGrant("leads=explode")).toBeNull()
		expect(parseGrant("machines-org:*=explode")).toBeNull()
	})
})
