import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { ApproveAccessButton } from "@/components/team/approve-access-button"
import { RejectAccessButton } from "@/components/team/reject-access-button"
import { listAccessRequests } from "@/lib/repositories/users"
import { listRoles } from "@/lib/repositories/roles"
import {
	PERMISSION_CATALOG,
	grantablePermissions,
	hasAllOrganizations,
	hasPermission,
	isSystemAdmin,
} from "@/lib/auth/permissions"
import { assignableRoles } from "@/lib/auth/team-access"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = {
	title: "Access requests",
}

export default async function AccessRequestsPage() {
	const user = await getDashboardUser()
	const canApprove = hasPermission(user, "signups:approve")
	const canReject = hasPermission(user, "signups:reject")
	const canGrant = hasPermission(user, "users:grant")
	const catalog = [...PERMISSION_CATALOG]
	let requests = [] as Awaited<ReturnType<typeof listAccessRequests>>
	let roles = assignableRoles(user, [])
	let fleet = { organizations: [], locations: [], machines: [] } as Pick<
		Awaited<ReturnType<typeof loadVisibleFleet>>,
		"organizations" | "locations" | "machines"
	>

	try {
		const [pending, allRoles, visible] = await Promise.all([
			listAccessRequests(),
			canApprove ? listRoles() : Promise.resolve([]),
			canApprove ? loadVisibleFleet(user) : Promise.resolve(fleet),
		])
		requests = pending
		roles = assignableRoles(user, allRoles)
		fleet = visible
	} catch (error) {
		console.error(error)
	}

	const grantable = grantablePermissions(user)
	const allowOrgWildcard = hasAllOrganizations(user) || isSystemAdmin(user)

	return (
		<PageShell
			title="Access requests"
			subtitle="People who signed up and are waiting for access. They have no role or organization until approved."
			permission="signups:read"
		>
			{requests.length === 0 ? (
				<EmptyState title="No pending requests" body="New signups appear here after they verify their email." />
			) : (
				<div className="overflow-hidden rounded-3xl bg-white card-shadow">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
								<th className="px-6 py-4 font-semibold">Person</th>
								<th className="px-6 py-4 font-semibold">Email verified</th>
								<th className="px-6 py-4 font-semibold">Requested</th>
								<th className="px-6 py-4 font-semibold" />
							</tr>
						</thead>
						<tbody>
							{requests.map((request) => (
								<tr key={request.id} className="border-b border-[#ECEAE6] last:border-0">
									<td className="px-6 py-5">
										<p className="text-[14px] font-medium">{request.name}</p>
										<p className="mt-1 text-[13px] text-[#8C8C8C]">{request.email}</p>
									</td>
									<td className="px-6 py-5 text-[13px] text-[#555555]">
										{request.emailVerified ? "Yes" : "Not yet"}
									</td>
									<td className="px-6 py-5 text-[13px] text-[#8C8C8C]">{formatDate(request.createdAt)}</td>
									<td className="px-6 py-5">
										<div className="flex flex-wrap items-start justify-end gap-2">
											{canApprove ? (
												<ApproveAccessButton
													userId={request.id}
													assignableRoles={roles}
													organizations={fleet.organizations}
													locations={fleet.locations}
													machines={fleet.machines}
													catalog={catalog}
													grantable={grantable}
													canGrantExtras={canGrant}
													allowOrgWildcard={allowOrgWildcard}
												/>
											) : null}
											{canReject ? <RejectAccessButton userId={request.id} name={request.name} /> : null}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</PageShell>
	)
}
