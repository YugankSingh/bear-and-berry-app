import type {
	BlogPostDocument,
	InventorySlotDocument,
	LeadDocument,
	LocationDocument,
	MachineDocument,
	OrganizationDocument,
	UserDocument,
} from "@/lib/db/documents"
import type { BlogPostRecord } from "@/types/cms"
import { resolveAccessStatus, resolveInviteState } from "@/lib/auth/access"
import { resolvePermissions } from "@/lib/auth/permissions"
import { orgSlugFromPath, resolveResourceAccess } from "@/lib/auth/resource-access"
import { compileGrants, membershipsFromAccess } from "@/lib/auth/compile-grants"
import { normalizeMemberships, stringifyGrants } from "@/lib/auth/grants"
import { titleCase } from "@/lib/format"
import type {
	InventorySlotRecord,
	LeadRecord,
	LocationRecord,
	MachineRecord,
	OrganizationRecord,
	RoleRecord,
	UserRecord,
} from "@/types/domain"

export function toIso(date: Date): string {
	return date.toISOString()
}

export function mapOrganization(doc: OrganizationDocument): OrganizationRecord {
	return {
		id: doc._id.toHexString(),
		slug: doc.slug,
		name: doc.name,
		kind: doc.kind,
		tags: doc.tags,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapUser(doc: UserDocument, role?: RoleRecord | null): UserRecord {
	const extraPermissions = resolvePermissions(null, doc.extraPermissions)
	const permissions = resolvePermissions(role, extraPermissions)
	const extraGrants = doc.extraGrants ?? []
	const resourceAccess = resolveResourceAccess({
		...doc,
		permissions,
		extraPermissions,
	})
	const memberships = normalizeMemberships(
		Array.isArray(doc.memberships)
			? doc.memberships
			: membershipsFromAccess({
					role: doc.role,
					resourceAccess,
					orgSlug: doc.orgSlug,
					permissions,
				}),
	)
	const grants = compileGrants({
		role,
		permissions,
		extraPermissions,
		extraGrants,
		memberships,
		resourceAccess,
		orgSlug: doc.orgSlug,
	})
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		email: doc.email,
		role: doc.role,
		roleName: role?.name ?? titleCase(doc.role),
		roleRank: role?.rank ?? 0,
		orgId: doc.orgId.toHexString(),
		orgSlug: doc.orgSlug,
		organization: doc.organization,
		scopePath: doc.scopePath,
		tags: doc.tags,
		isActive: doc.isActive,
		accessStatus: resolveAccessStatus(doc.accessStatus),
		resourceAccess,
		memberships,
		extraPermissions,
		extraGrants,
		grants,
		grantKeys: stringifyGrants(grants),
		permissions,
		emailVerified: doc.emailVerified ?? true,
		passwordReady: doc.passwordReady ?? true,
		inviteState: resolveInviteState(doc),
		inviteExpiresAt: doc.inviteExpiresAt ? toIso(doc.inviteExpiresAt) : null,
		deletedAt: doc.deletedAt ? toIso(doc.deletedAt) : null,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapLead(doc: LeadDocument): LeadRecord {
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		email: doc.email,
		phone: doc.phone,
		organization: doc.organization,
		location: doc.location,
		footfall: doc.footfall,
		timeline: doc.timeline,
		operatorContext: doc.operatorContext,
		message: doc.message,
		intent: doc.intent,
		source: doc.source,
		status: doc.status,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapLocation(doc: LocationDocument): LocationRecord {
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		city: doc.city,
		region: doc.region,
		address: doc.address,
		siteType: doc.siteType,
		footfallDaily: doc.footfallDaily,
		orgId: doc.orgId.toHexString(),
		orgSlug: orgSlugFromPath(doc.path),
		path: doc.path,
		tags: doc.tags,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapMachine(
	doc: MachineDocument,
	locationName: string | null = null,
): MachineRecord {
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		serialNumber: doc.serialNumber,
		model: doc.model,
		status: doc.status,
		locationId: doc.locationId ? doc.locationId.toHexString() : null,
		locationName,
		orgId: doc.orgId.toHexString(),
		orgSlug: orgSlugFromPath(doc.path),
		path: doc.path,
		tags: doc.tags,
		uptimePercent: doc.uptimePercent,
		cupsToday: doc.cupsToday,
		lastHeartbeatAt: doc.lastHeartbeatAt ? toIso(doc.lastHeartbeatAt) : null,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapInventorySlot(
	doc: InventorySlotDocument,
	machineName: string,
): InventorySlotRecord {
	return {
		id: doc._id.toHexString(),
		machineId: doc.machineId.toHexString(),
		machineName,
		slotIndex: doc.slotIndex,
		sku: doc.sku,
		label: doc.label,
		quantity: doc.quantity,
		capacity: doc.capacity,
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapBlogPost(doc: BlogPostDocument): BlogPostRecord {
	return {
		id: doc._id.toHexString(),
		slug: doc.slug,
		title: doc.title,
		description: doc.description,
		category: doc.category,
		readTime: doc.readTime,
		status: doc.status,
		publishedAt: doc.publishedAt ? toIso(doc.publishedAt) : null,
		content: doc.content,
		authorName: doc.authorName,
		tags: doc.tags,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}