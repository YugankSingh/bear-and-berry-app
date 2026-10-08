import { describe, expect, it } from "vitest"
import { parseGrants } from "@/lib/auth/grants"
import { permissionsFromGrants } from "@/lib/auth/compile-grants"
import {
	authorizeAddTag,
	authorizeRemoveTag,
	canTagAnyOrganization,
	canTagOrganization,
	grantsGainedByTag,
} from "@/lib/auth/org-tagging"

function actor(keys: string[]) {
	const grants = parseGrants(keys)
	return { grants, permissions: permissionsFromGrants(grants) }
}

const acme = { slug: "acme", tags: ["partner"] }
const globex = { slug: "globex", tags: [] as string[] }

describe("organization tagging permissions", () => {
	it("requires orgs:tag that covers the organization", () => {
		const scoped = actor(["orgs-org:acme=edit"])
		expect(canTagOrganization(scoped, acme)).toBe(true)
		expect(canTagOrganization(scoped, globex)).toBe(false)
		expect(canTagAnyOrganization(scoped)).toBe(true)
	})

	it("accepts orgs:tag granted through a tag the organization already carries", () => {
		const viaTag = actor(["orgs-orgtag:partner=edit"])
		expect(canTagOrganization(viaTag, acme)).toBe(true)
		expect(canTagOrganization(viaTag, globex)).toBe(false)
		expect(authorizeRemoveTag(viaTag, acme).ok).toBe(true)
		expect(authorizeRemoveTag(viaTag, globex).ok).toBe(false)
	})

	it("org:* covers every organization", () => {
		const all = actor(["orgs-org:*=edit"])
		expect(canTagOrganization(all, globex)).toBe(true)
	})

	it("viewing all organizations is not enough to tag them", () => {
		const viewer = actor(["orgs-org:*=view"])
		expect(viewer.permissions).toContain("orgs:all")
		expect(canTagOrganization(viewer, acme)).toBe(false)
		expect(canTagAnyOrganization(viewer)).toBe(false)
	})

	it("a scoped orgs view grant does not turn into orgs:all", () => {
		expect(actor(["orgs-org:acme=view"]).permissions).not.toContain("orgs:all")
	})

	it("system admins can tag anything", () => {
		const admin = actor(["system=admin"])
		expect(authorizeAddTag(admin, globex, "partner").ok).toBe(true)
	})

	it("blocks adding a tag that would widen the actor's own access", () => {
		const sneaky = actor(["orgs-org:globex=edit", "machines-orgtag:partner-tag:*-location:*=edit"])
		expect(grantsGainedByTag(sneaky, globex, "partner")).toHaveLength(1)
		const decision = authorizeAddTag(sneaky, globex, "partner")
		expect(decision.ok).toBe(false)
		expect(authorizeAddTag(sneaky, globex, "north").ok).toBe(true)
	})

	it("re-adding a tag the organization already has gains nothing", () => {
		const scoped = actor(["orgs-org:acme=edit", "machines-orgtag:partner-tag:*-location:*=edit"])
		expect(grantsGainedByTag(scoped, acme, "partner")).toHaveLength(0)
	})
})
