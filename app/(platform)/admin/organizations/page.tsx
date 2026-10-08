import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { listOrganizations } from "@/lib/repositories/organizations"
import { listTagCatalog } from "@/lib/repositories/organization-tags"
import { OrgOpenButton } from "@/components/admin/org-open-button"
import { OrganizationTagsEditor } from "@/components/admin/organization-tags-editor"
import { CreateOrganizationForm } from "@/components/admin/create-organization-form"
import { isSystemAdmin } from "@/lib/auth/permissions"
import { canTagOrganization } from "@/lib/auth/org-tagging"

export const metadata: Metadata = {
	title: "Organizations",
}

export default async function AdminOrganizationsPage() {
	const user = await getDashboardUser()
	let organizations = [] as Awaited<ReturnType<typeof listOrganizations>>
	let catalog: string[] = []
	try {
		;[organizations, catalog] = await Promise.all([listOrganizations(), listTagCatalog()])
	} catch (error) {
		console.error(error)
	}
	const usage = new Map(catalog.map((tag) => [tag, organizations.filter((org) => org.tags.includes(tag)).length]))

	return (
		<PageShell
			title="Organizations"
			subtitle="Roles attach to an organization or an organization tag. Opening one takes you into that workspace."
			permission="orgs:all"
		>
			{isSystemAdmin(user) ? (
				<div className="mb-6">
					<CreateOrganizationForm catalog={catalog} />
				</div>
			) : null}
			<section className="mb-6 rounded-3xl bg-white p-6 card-shadow">
				<p className="mb-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">Tag catalog</p>
				<p className="mb-4 text-[13px] text-[#8C8C8C]">
					Every organization tag. Changing tags on an organization needs the Tag organizations permission for
					that organization, either directly or through a tag it already has.
				</p>
				<div className="flex flex-wrap gap-1.5">
					{catalog.length === 0 ? <span className="text-[12px] text-[#8C8C8C]">No tags yet.</span> : null}
					{catalog.map((tag) => (
						<span
							key={tag}
							className="rounded-full border border-[#ECEAE6] bg-[#F8F6F2] px-2.5 py-1 text-[11px] text-[#555555]"
						>
							{tag}
							<span className="ml-1.5 text-[#8C8C8C]">
								{usage.get(tag) === 1 ? "1 org" : `${usage.get(tag) ?? 0} orgs`}
							</span>
						</span>
					))}
				</div>
			</section>
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
								<td className="px-6 py-5">
									<OrganizationTagsEditor
										orgSlug={org.slug}
										tags={org.tags}
										canEdit={canTagOrganization(user, org)}
										catalog={catalog}
									/>
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
