import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { InviteUserForm } from "@/components/team/invite-user-form"
import { listUsers } from "@/lib/repositories/users"
import { hasPermission } from "@/lib/auth/rbac"
import { formatDate, titleCase } from "@/lib/format"

export const metadata: Metadata = {
	title: "Team",
}

export default async function TeamPage() {
	const user = await getDashboardUser()
	let users = [] as Awaited<ReturnType<typeof listUsers>>
	try {
		users = await listUsers()
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Team"
			subtitle="Invitation-only accounts. Roles are enforced on every API and page."
			permission="users:read"
		>
			{hasPermission(user.role, "users:write") ? (
				<div className="mb-6">
					<InviteUserForm />
				</div>
			) : null}

			<div className="overflow-hidden rounded-3xl bg-white card-shadow">
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
							<th className="px-6 py-4 font-semibold">Person</th>
							<th className="px-6 py-4 font-semibold">Role</th>
							<th className="px-6 py-4 font-semibold">Organization</th>
							<th className="px-6 py-4 font-semibold">Added</th>
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
									<Badge tone={member.role === "super_admin" ? "berry" : "neutral"}>
										{titleCase(member.role)}
									</Badge>
								</td>
								<td className="px-6 py-5 text-[13px] text-[#555555]">
									{member.organization ?? "—"}
								</td>
								<td className="px-6 py-5 text-[13px] text-[#8C8C8C]">{formatDate(member.createdAt)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</PageShell>
	)
}
