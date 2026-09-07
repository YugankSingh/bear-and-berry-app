import type { Metadata } from "next"
import Link from "next/link"
import { getDashboardUser } from "@/components/layout/page-shell"
import { BrandLockup } from "@/components/brand/brand-lockup"
import { organizationPath } from "@/lib/auth/org-path"
import { toRoute } from "@/lib/auth/next-path"
import { getAppEnvironment } from "@/lib/env"
import { getAppEnvironmentLabel } from "@/lib/env-client"

export const metadata: Metadata = {
	title: "Organizations",
}

export default async function OrganizationPickerPage() {
	const user = await getDashboardUser()
	const orgs = user.accessibleOrgs

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-10">
			<div className="flex items-start justify-between gap-4">
				<div className="rounded-2xl bg-white px-4 py-3 card-shadow">
					<BrandLockup size="sm" />
				</div>
				<div className="flex items-center gap-3">
					{user.canAccessAdmin ? (
						<Link
							href={toRoute("/admin")}
							className="rounded-full border border-[#ECEAE6] bg-white px-5 py-[11px] text-[13px] text-[#1A1A1A]/70 hover:text-[#1A1A1A]"
						>
							Platform
						</Link>
					) : null}
					<a
						href="/apis/auth/logout"
						className="rounded-full border border-[#ECEAE6] bg-white px-5 py-[11px] text-[13px] text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
					>
						Sign out
					</a>
				</div>
			</div>

			<p className="mb-3 mt-12 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
				{getAppEnvironmentLabel(getAppEnvironment())}
			</p>
			<h1 className="text-[36px] font-extrabold tracking-[-2px] text-[#1A1A1A]">Choose an organization</h1>
			<p className="mt-3 max-w-xl text-[14px] leading-[1.7] text-[#8C8C8C]">
				Each organization has its own URL. You can switch later from the top of any org page.
			</p>

			<div className="mt-8 grid gap-3">
				{orgs.length === 0 ? (
					<p className="rounded-3xl bg-white px-6 py-8 text-[14px] text-[#8C8C8C] card-shadow">
						No organizations are on your session yet. Ask an admin to grant access, then sign in again.
					</p>
				) : (
					orgs.map((org) => (
						<Link
							key={org.id || org.slug}
							href={toRoute(organizationPath(org.slug, "/overview"))}
							className="rounded-3xl bg-white px-6 py-5 card-shadow transition-colors hover:bg-[#F8F6F2]"
						>
							<p className="text-[16px] font-medium text-[#1A1A1A]">{org.name}</p>
							<p className="mt-1 text-[12px] text-[#8C8C8C]">/organization/{org.slug}</p>
							{org.tags.length > 0 ? (
								<p className="mt-2 text-[12px] text-[#8C8C8C]">{org.tags.join(" · ")}</p>
							) : null}
						</Link>
					))
				)}
			</div>
		</div>
	)
}
