import { grantMatchesOrg, hasAnyCapability, hasCapability, type AccessGrant } from "@/lib/auth/grants"
import { isSystemAdmin } from "@/lib/auth/permissions"

type TaggingActor = {
	permissions?: readonly string[]
	grants?: AccessGrant[]
}

type TaggedOrg = {
	slug: string
	tags: readonly string[]
}

export type TagDecision = { ok: true } | { ok: false; status: 403; error: string }

/**
 * `orgs:tag` must cover the organization itself: org:{slug}, org:*, or orgtag:{tag the org already carries}.
 */
export function canTagOrganization(actor: TaggingActor, org: TaggedOrg): boolean {
	if (isSystemAdmin(actor)) {
		return true
	}
	return hasCapability(actor.grants, { resource: "orgs", action: "edit", org: org.slug, orgTags: org.tags })
}

/** Holds `orgs:tag` somewhere, which is also what it takes to add a new tag to the catalog. */
export function canTagAnyOrganization(actor: TaggingActor): boolean {
	return isSystemAdmin(actor) || hasAnyCapability(actor.grants, "orgs", "edit")
}

/** The actor's own grants that would start applying to `org` once `tag` is added to it. */
export function grantsGainedByTag(actor: TaggingActor, org: TaggedOrg, tag: string): AccessGrant[] {
	if (org.tags.includes(tag)) {
		return []
	}
	const tagged = { slug: org.slug, tags: [...org.tags, tag] }
	return (actor.grants ?? []).filter((grant) => !grantMatchesOrg(grant, org) && grantMatchesOrg(grant, tagged))
}

export function authorizeAddTag(actor: TaggingActor, org: TaggedOrg, tag: string): TagDecision {
	if (!canTagOrganization(actor, org)) {
		return { ok: false, status: 403, error: `You do not have permission to tag ${org.slug}.` }
	}
	if (!isSystemAdmin(actor) && grantsGainedByTag(actor, org, tag).length > 0) {
		return {
			ok: false,
			status: 403,
			error: `Adding "${tag}" would give you access to ${org.slug} that you don't already have. Ask a system admin to add it.`,
		}
	}
	return { ok: true }
}

export function authorizeRemoveTag(actor: TaggingActor, org: TaggedOrg): TagDecision {
	if (!canTagOrganization(actor, org)) {
		return { ok: false, status: 403, error: `You do not have permission to change tags on ${org.slug}.` }
	}
	return { ok: true }
}
