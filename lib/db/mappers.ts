import type {
	BlogPostDocument,
	InventorySlotDocument,
	LeadDocument,
	LocationDocument,
	MachineDocument,
	OrganizationDocument,
	UserDocument,
} from "@/lib/db/documents"
import { estimateReadTime } from "@/lib/cms/read-time"
import type { BlogPostRecord } from "@/types/cms"
import { resolveAccessStatus, resolveInviteState } from "@/lib/auth/access"
import { buildUserGrants } from "@/lib/auth/resolve-user-grants"
import type { AccessGrant, OrgMembership } from "@/lib/auth/grants"
import { orgSlugFromPath } from "@/lib/auth/fleet-access"
import { titleCase } from "@/lib/format"
import type {
	InventorySlotRecord,
	LeadRecord,
	LocationRecord,
	MachineRecord,
	OrganizationRecord,
	Permission,
	RoleRecord,
	UserRecord,
} from "@/types/domain"

type CompiledUserGrants = {
	memberships: OrgMembership[]
	extraGrants: AccessGrant[]
	grants: AccessGrant[]
	grantKeys: string[]
	permissions: Permission[]
}

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

export function mapUser(
	doc: UserDocument,
	role?: RoleRecord | null,
	compiledGrants?: CompiledUserGrants,
): UserRecord {
	const compiled =
		compiledGrants ??
		buildUserGrants(
			{
				role: doc.role,
				orgSlug: doc.orgSlug,
				memberships: doc.memberships,
				extraGrants: doc.extraGrants,
			},
			role,
		)
	return {
		id: doc._id.toHexString(),
		name: doc.name,
		email: doc.email,
		role: doc.role,
		roleName: role?.name ?? titleCase(doc.role),
		roleRank: role?.rank ?? 0,
		orgId: doc.orgId.toHexString(),
		orgSlug: doc.orgSlug,
		tags: doc.tags,
		isActive: doc.isActive,
		accessStatus: resolveAccessStatus(doc.accessStatus),
		memberships: compiled.memberships,
		extraGrants: compiled.extraGrants,
		grants: compiled.grants,
		grantKeys: compiled.grantKeys,
		permissions: compiled.permissions,
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
		archivedAt: doc.archivedAt ? toIso(doc.archivedAt) : null,
		comments: (doc.comments ?? []).map((comment) => ({
			id: comment.id,
			body: comment.body,
			authorId: comment.authorId,
			authorName: comment.authorName,
			createdAt: toIso(comment.createdAt),
		})),
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
		orgSlug: doc.orgSlug || orgSlugFromPath(doc.path),
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
		orgSlug: doc.orgSlug || orgSlugFromPath(doc.path),
		path: doc.path,
		tags: doc.tags,
		uptimePercent: doc.uptimePercent,
		cupsToday: doc.cupsToday,
		lastHeartbeatAt: doc.lastHeartbeatAt ? toIso(doc.lastHeartbeatAt) : null,
		installState: doc.installState ?? "unpaired",
		deviceStatusMessage: doc.deviceStatusMessage ?? null,
		opsUsername: doc.opsUsername ?? null,
		opsPasswordSetAt: doc.opsPasswordSetAt ? toIso(doc.opsPasswordSetAt) : null,
		hasOpsPassword: Boolean(doc.opsPasswordEnc),
		hasDeviceKey: Boolean(doc.deviceKeyHash),
		sshHost: doc.sshHost ?? null,
		pairedAt: doc.pairedAt ? toIso(doc.pairedAt) : null,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}

export function mapInventorySlot(
	doc: InventorySlotDocument,
	machineName?: string,
): InventorySlotRecord {
	return {
		id: doc._id.toHexString(),
		machineId: doc.machineId.toHexString(),
		machineName: machineName || doc.machineName || "Unknown machine",
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
		metaTitle: doc.metaTitle?.trim() || doc.title,
		metaDescription: doc.metaDescription?.trim() || doc.description,
		category: doc.category,
		readTime: estimateReadTime(doc.content),
		status: doc.status,
		publishedAt: doc.publishedAt ? toIso(doc.publishedAt) : null,
		content: doc.content,
		authorName: doc.authorName,
		tags: doc.tags,
		createdAt: toIso(doc.createdAt),
		updatedAt: toIso(doc.updatedAt),
	}
}
