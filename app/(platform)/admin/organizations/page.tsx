import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { listOrganizations } from "@/lib/repositories/organizations"
import { OrgOpenButton } from "@/components/admin/org-open-button"

export const metadata: Metadata = {
	title: "Organizations",
}

export default async function AdminOrganizationsPage() {
	await getDashboardUser()
	let organizations = [] as Awaited<ReturnType<typeof listOrganizations>>
	try {
		organizations = await listOrganizations()
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Organizations"
			subtitle="Roles attach to an organization or an organization tag. Opening one takes you into that workspace."
			permission="orgs:all"
		>
			<div className="overflow-hidden rounded-3xl bg-white card-shadow">
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
							<th className="px-6 py-4 font-semibold">Organization</th>
							<th className="px-6 py-4 font-semibold">Kind</th>
							<th className="px-6 py-4 font-semibold">Tags</th>
							<th className="px-6 py-4 font-semibold"> </th>
						</tr>
					</thead>
					<tbody>
						{organizations.map((org) => (
							<tr key={org.id} className="border-b border-[#ECEAE6] last:border-0">
								<td className="px-6 py-5">
									<p className="text-[14px] font-medium text-[#1A1A1A]">{org.name}</p>
									<p className="mt-1 text-[12px] text-[#8C8C8C]">{org.slug}</p>
								</td>
								<td className="px-6 py-5 text-[13px] text-[#8C8C8C]">{org.kind}</td>
								<td className="px-6 py-5 text-[13px] text-[#8C8C8C]">
									{org.tags.length > 0 ? org.tags.join(", ") : "—"}
								</td>
								<td className="px-6 py-5 text-right">
									<OrgOpenButton orgSlug={org.slug} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</PageShell>
	)
}
