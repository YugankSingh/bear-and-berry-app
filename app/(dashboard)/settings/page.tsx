import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { OrganizationTagsEditor } from "@/components/admin/organization-tags-editor"
import { canTagOrganization } from "@/lib/auth/org-tagging"
import { findOrganizationBySlug } from "@/lib/repositories/organizations"
import { listTagCatalog } from "@/lib/repositories/organization-tags"

export const metadata: Metadata = {
	title: "Settings",
}

export default async function SettingsPage() {
	const user = await getDashboardUser()
	let activeOrg: { slug: string; name: string; tags: string[] } | null = null
	let canEditTags = false
	let tagCatalog: string[] = []
	if (user.activeOrgSlug) {
		try {
			const org = await findOrganizationBySlug(user.activeOrgSlug)
			activeOrg = org ? { slug: org.slug, name: org.name, tags: org.tags } : null
			canEditTags = activeOrg ? canTagOrganization(user, activeOrg) : false
			tagCatalog = canEditTags ? await listTagCatalog() : []
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<PageShell
			title="Settings"
			subtitle="Your account and the grants currently on this session. Role templates live in the platform workspace."
			permission="settings:read"
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-3xl bg-white p-6 card-shadow">
					<p className="mb-6 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
						Account
					</p>
					<dl className="space-y-4 text-[14px]">
						<div className="flex justify-between gap-4 border-b border-[#ECEAE6] pb-4">
							<dt className="text-[#8C8C8C]">Name</dt>
							<dd>{user.name}</dd>
						</div>
						<div className="flex justify-between gap-4 border-b border-[#ECEAE6] pb-4">
							<dt className="text-[#8C8C8C]">Email</dt>
							<dd>{user.email}</dd>
						</div>
						<div className="flex justify-between gap-4 border-b border-[#ECEAE6] pb-4">
							<dt className="text-[#8C8C8C]">Role</dt>
							<dd>{user.roleName}</dd>
						</div>
						<div className="flex justify-between gap-4">
							<dt className="text-[#8C8C8C]">Organization</dt>
							<dd>{user.activeOrgSlug || user.orgSlug}</dd>
						</div>
					</dl>
				</section>

				<section className="rounded-3xl bg-[#1A1A1A] p-6 text-white">
					<p className="mb-6 text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
						Session grants
					</p>
					<p className="mb-4 text-[13px] text-white/50">
						Checked in-memory from your signed session. Missing org never means all — all-org access is org:*.
					</p>
					<div className="flex flex-wrap gap-2">
						{(user.grantKeys.length > 0 ? user.grantKeys : user.permissions).map((grant) => (
							<span
								key={grant}
								className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70"
							>
								{grant}
							</span>
						))}
					</div>
				</section>

				{activeOrg ? (
					<section className="rounded-3xl bg-white p-6 card-shadow lg:col-span-2">
						<p className="mb-2 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
							Organization tags
						</p>
						<p className="mb-5 text-[13px] text-[#8C8C8C]">
							Tags on {activeOrg.name}. Roles bound to a tag apply to every organization that carries it.
							{canEditTags ? "" : " Changing them needs the Tag organizations permission for this organization."}
						</p>
						<OrganizationTagsEditor
							orgSlug={activeOrg.slug}
							tags={activeOrg.tags}
							canEdit={canEditTags}
							catalog={tagCatalog}
						/>
					</section>
				) : null}
			</div>
		</PageShell>
	)
}
