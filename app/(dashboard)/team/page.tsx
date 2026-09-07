import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { InviteUserForm } from "@/components/team/invite-user-form"
import { ApproveAccessButton } from "@/components/team/approve-access-button"
import { RemoveUserButton } from "@/components/team/remove-user-button"
import { ResendInviteButton } from "@/components/team/resend-invite-button"
import { UserPermissionsButton } from "@/components/team/user-permissions-button"
import { listUsers } from "@/lib/repositories/users"
import { listPermissionCatalog, listRoles } from "@/lib/repositories/roles"
import { grantablePermissions, hasAllOrganizations, hasPermission, isSystemAdmin } from "@/lib/auth/permissions"
import {
	assignableRoles,
	canManageUser,
	canSeeTeamMember,
} from "@/lib/auth/resource-access"
import { GRANT_WILDCARD } from "@/lib/auth/grants"
import type { UserRecord } from "@/types/domain"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = {
	title: "Team",
}

export default async function TeamPage() {
	const user = await getDashboardUser()
	const canInvite = hasPermission(user, "users:write")
	const canRemove = hasPermission(user, "users:delete")
	const canGrant = hasPermission(user, "users:grant")
	let roles = assignableRoles(user, [])
	let catalog = [] as Awaited<ReturnType<typeof listPermissionCatalog>>
	let users = [] as Awaited<ReturnType<typeof listUsers>>
	let organizations = [] as Awaited<ReturnType<typeof loadVisibleFleet>>["organizations"]
	let locations = [] as Awaited<ReturnType<typeof loadVisibleFleet>>["locations"]
	let machines = [] as Awaited<ReturnType<typeof loadVisibleFleet>>["machines"]

	try {
		const [allUsers, fleet, allRoles, permissions] = await Promise.all([
			listUsers(),
			loadVisibleFleet(user),
			listRoles(),
			listPermissionCatalog(),
		])
		users = allUsers.filter((member) => {
			if (!canSeeTeamMember(user, member)) {
				return false
			}
			if (!user.activeOrgSlug) {
				return true
			}
			return (
				member.orgSlug === user.activeOrgSlug ||
				member.memberships.some(
					(membership) => membership.org === user.activeOrgSlug || membership.org === "*",
				) ||
				member.resourceAccess.organizationSlugs.includes(user.activeOrgSlug)
			)
		})
		roles = assignableRoles(user, allRoles)
		catalog = permissions
		organizations = fleet.organizations
		locations = fleet.locations
		machines = fleet.machines
	} catch (error) {
		console.error(error)
	}

	const grantable = grantablePermissions(user)
	const allowOrgWildcard = hasAllOrganizations(user) || isSystemAdmin(user)

	return (
		<PageShell
			title="Team"
			subtitle="Pick a role, bind it to an organization when needed, then add extra permissions with only the scopes they support."
			permission="users:read"
		>
			{canInvite ? (
				<div className="mb-6">
					<InviteUserForm
						assignableRoles={roles}
						organizations={organizations}
						locations={locations}
						machines={machines}
						catalog={catalog}
						grantable={grantable}
						canGrantExtras={canGrant}
						allowOrgWildcard={allowOrgWildcard}
					/>
				</div>
			) : null}

			<div className="overflow-hidden rounded-3xl bg-white card-shadow">
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
							<th className="px-6 py-4 font-semibold">Person</th>
							<th className="px-6 py-4 font-semibold">Role</th>
							<th className="px-6 py-4 font-semibold">Status</th>
							<th className="px-6 py-4 font-semibold">Scope</th>
							<th className="px-6 py-4 font-semibold">Added</th>
							<th className="px-6 py-4 font-semibold" />
						</tr>
					</thead>
					<tbody>
						{users.map((member) => (
							<tr key={member.id} className="border-b border-[#ECEAE6] last:border-0">
								<td className="px-6 py-5">
									<p className="text-[14px] font-medium">{member.name}</p>
									<p className="mt-1 text-[13px] text-[#8C8C8C]">{member.email}</p>
								</td>
								<td className="px-6 py-5">
									<Badge tone={isSystemAdmin(member) ? "berry" : "neutral"}>
										{member.roleName}
									</Badge>
									{member.extraGrants.length > 0 || member.extraPermissions.length > 0 ? (
										<p className="mt-2 text-[11px] text-[#8C8C8C]">
											+{member.extraGrants.length || member.extraPermissions.length} extra
										</p>
									) : null}
								</td>
								<td className="px-6 py-5">
									<Badge
										tone={
											member.inviteState === "expired" || member.accessStatus === "waitlisted"
												? "warn"
												: member.accessStatus === "invited" && member.inviteState !== "pending"
													? "success"
													: "neutral"
										}
									>
										{member.inviteState === "pending"
											? "Invite sent"
											: member.inviteState === "expired"
												? "Invite expired"
												: member.accessStatus === "waitlisted"
													? "Waitlisted"
													: member.accessStatus === "pending_invite"
														? "Invite sent"
														: "Invited"}
									</Badge>
								</td>
								<td className="px-6 py-5 text-[13px] text-[#555555]">
									{summarizeMemberAccess(member)}
								</td>
								<td className="px-6 py-5 text-[13px] text-[#8C8C8C]">{formatDate(member.createdAt)}</td>
								<td className="px-6 py-5">
									<div className="flex flex-wrap items-center justify-end gap-2">
										{canInvite && member.accessStatus === "waitlisted" && canManageUser(user, member) ? (
											<ApproveAccessButton
												userId={member.id}
												assignableRoles={roles}
												organizations={organizations}
												locations={locations}
												machines={machines}
												catalog={catalog}
												grantable={grantable}
												canGrantExtras={canGrant}
												allowOrgWildcard={allowOrgWildcard}
											/>
										) : null}
										{canInvite &&
										(member.inviteState === "pending" || member.inviteState === "expired") &&
										canManageUser(user, member) ? (
											<ResendInviteButton userId={member.id} />
										) : null}
										{(canGrant || canInvite) && canManageUser(user, member) ? (
											<UserPermissionsButton
												user={member}
												catalog={catalog}
												grantable={grantable}
												assignableRoles={roles}
												organizations={organizations}
												locations={locations}
												machines={machines}
												canEditMembership={canInvite}
												canGrantExtras={canGrant}
												allowOrgWildcard={allowOrgWildcard}
											/>
										) : null}
										{canRemove && canManageUser(user, member) ? (
											<RemoveUserButton userId={member.id} name={member.name} />
										) : null}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</PageShell>
	)
}

function summarizeMemberAccess(member: UserRecord): string {
	if (isSystemAdmin(member) || member.memberships.some((item) => item.org === GRANT_WILDCARD)) {
		return "All organizations"
	}
	const parts: string[] = []
	for (const membership of member.memberships) {
		if (membership.org) {
			parts.push(membership.org)
		} else if (membership.orgTag) {
			parts.push(`org tag ${membership.orgTag}`)
		}
	}
	if (member.extraGrants.length > 0) {
		parts.push(`${member.extraGrants.length} extra`)
	}
	return parts.join(" · ") || "Platform"
}
