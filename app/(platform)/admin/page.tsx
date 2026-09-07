import type { Metadata } from "next"
import Link from "next/link"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { listOrganizations } from "@/lib/repositories/organizations"
import { listUsers } from "@/lib/repositories/users"
import { formatNumber } from "@/lib/format"
import { toRoute } from "@/lib/auth/next-path"

export const metadata: Metadata = {
	title: "Platform",
}

export default async function AdminHomePage() {
	const user = await getDashboardUser()
	let orgCount = 0
	let userCount = 0
	try {
		const [orgs, users] = await Promise.all([listOrganizations(), listUsers()])
		orgCount = orgs.length
		userCount = users.length
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Platform"
			subtitle="Owner and partner tools. Switch into an organization at the top when you need fleet work."
			permission="dashboard:read"
		>
			<div className="grid gap-4 md:grid-cols-3">
				<section className="rounded-3xl bg-[#1A1A1A] p-6 text-white">
					<p className="text-[11px] uppercase tracking-[3px] text-white/40">Organizations</p>
					<p className="mt-4 text-[32px] font-extrabold tracking-[-1px]">{formatNumber(orgCount)}</p>
					<Link href={toRoute("/admin/organizations")} className="mt-4 inline-block text-[13px] text-white/60 hover:text-white">
						Manage organizations
					</Link>
				</section>
				<section className="rounded-3xl bg-white p-6 card-shadow">
					<p className="text-[11px] uppercase tracking-[3px] text-[#8C8C8C]">People</p>
					<p className="mt-4 text-[32px] font-extrabold tracking-[-1px] text-[#1A1A1A]">{formatNumber(userCount)}</p>
					<Link href={toRoute("/admin/team")} className="mt-4 inline-block text-[13px] text-[#8C8C8C] hover:text-[#1A1A1A]">
						Open team
					</Link>
				</section>
				<section className="rounded-3xl bg-white p-6 card-shadow">
					<p className="text-[11px] uppercase tracking-[3px] text-[#8C8C8C]">Signed in as</p>
					<p className="mt-4 text-[18px] font-medium text-[#1A1A1A]">{user.name}</p>
					<p className="mt-2 text-[13px] text-[#8C8C8C]">{user.roleName}</p>
				</section>
			</div>
		</PageShell>
	)
}
