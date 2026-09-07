import { z } from "zod"
import { ACCESS_MODES, ACCESS_STATUSES, PERMISSIONS } from "@/types/domain"
import { GRANT_ACTIONS, GRANT_RESOURCES, fillRequiredWildcards, validateGrant } from "@/lib/auth/grants"
import { isLimitedAccessComplete } from "@/lib/auth/resource-access"

export const resourceAccessSchema = z
	.object({
		mode: z.enum(ACCESS_MODES),
		organizationSlugs: z.array(z.string().trim().min(1).max(80)).default([]),
		organizationTags: z.array(z.string().trim().min(1).max(80)).default([]),
		locationIds: z.array(z.string().trim().min(1)).default([]),
		machineIds: z.array(z.string().trim().min(1)).default([]),
		machineTags: z.array(z.string().trim().min(1).max(40)).default([]),
	})
	.superRefine((value, ctx) => {
		if (value.mode === "limited" && !isLimitedAccessComplete(value)) {
			ctx.addIssue({
				code: "custom",
				message: "Choose all access, or pick at least one organization, organization tag, location, machine, or tag.",
			})
		}
	})

export const membershipSchema = z
	.object({
		org: z.string().trim().min(1).max(80).nullable().optional(),
		orgTag: z.string().trim().min(1).max(80).nullable().optional(),
	})
	.superRefine((value, ctx) => {
		const org = value.org?.trim() ?? ""
		const orgTag = value.orgTag?.trim() ?? ""
		if (org && orgTag) {
			ctx.addIssue({
				code: "custom",
				message: "Choose an organization or an organization tag, not both.",
			})
		}
		if (!org && !orgTag) {
			ctx.addIssue({
				code: "custom",
				message: "Choose an organization or an organization tag.",
			})
		}
	})

export const accessGrantSchema = z
	.object({
		resource: z.enum(GRANT_RESOURCES),
		action: z.enum(GRANT_ACTIONS),
		org: z.string().trim().min(1).max(80).nullable(),
		orgTag: z.string().trim().min(1).max(80).nullable(),
		tag: z.string().trim().min(1).max(80).nullable(),
		location: z.string().trim().min(1).max(80).nullable(),
		id: z.string().trim().min(1).max(80).nullable(),
	})
	.transform((value) =>
		fillRequiredWildcards({
			resource: value.resource,
			action: value.action,
			org: value.org,
			orgTag: value.orgTag,
			tag: value.tag,
			location: value.location,
			id: value.id,
		}),
	)
	.superRefine((value, ctx) => {
		const error = validateGrant(value)
		if (error) {
			ctx.addIssue({ code: "custom", message: error })
		}
	})

export const userCreateSchema = z.object({
	name: z.string().trim().min(2).max(80),
	email: z.string().trim().email(),
	password: z.string().min(8).max(128).optional(),
	role: z.string().trim().min(2).max(80),
	orgSlug: z.string().trim().min(2).max(80).optional(),
	organization: z.string().trim().max(120).optional(),
	scopePath: z.string().trim().min(1).max(240).optional(),
	tags: z.array(z.string().trim().min(1).max(40)).optional(),
	accessStatus: z.enum(ACCESS_STATUSES).optional(),
	extraPermissions: z.array(z.enum(PERMISSIONS)).optional(),
	extraGrants: z.array(accessGrantSchema).optional(),
	membership: membershipSchema.optional(),
	resourceAccess: resourceAccessSchema.optional(),
})

export const userPatchSchema = z.object({
	name: z.string().trim().min(2).max(80).optional(),
	role: z.string().trim().min(2).max(80).optional(),
	organization: z.string().trim().max(120).nullable().optional(),
	scopePath: z.string().trim().min(1).max(240).optional(),
	tags: z.array(z.string().trim().min(1).max(40)).optional(),
	isActive: z.boolean().optional(),
	password: z.string().min(8).max(128).optional(),
	accessStatus: z.enum(ACCESS_STATUSES).optional(),
	extraPermissions: z.array(z.enum(PERMISSIONS)).optional(),
	extraGrants: z.array(accessGrantSchema).optional(),
	membership: membershipSchema.optional(),
	resourceAccess: resourceAccessSchema.optional(),
})

export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserPatchInput = z.infer<typeof userPatchSchema>
