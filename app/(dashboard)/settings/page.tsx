import type { Metadata } from "next"
import { PageShell } from "@/components/layout/page-shell"
import { getAppEnvironment, getMongoDbName } from "@/lib/env"
import { permissionsForRole } from "@/lib/auth/rbac"
import { getDashboardUser } from "@/components/layout/page-shell"

export const metadata: Metadata = {
	title: "Settings",
}

export default async function SettingsPage() {
	const user = await getDashboardUser()
	const permissions = permissionsForRole(user.role)

	return (
		<PageShell
			title="Settings"
			subtitle="Environment, identity, and the permissions attached to your role."
			permission="settings:read"
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-3xl bg-white p-6 card-shadow">
					<p className="mb-6 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
						Environment
					</p>
					<dl className="space-y-4 text-[14px]">
						<div className="flex justify-between gap-4 border-b border-[#ECEAE6] pb-4">
							<dt className="text-[#8C8C8C]">APP_ENV</dt>
							<dd>{getAppEnvironment()}</dd>
						</div>
						<div className="flex justify-between gap-4 border-b border-[#ECEAE6] pb-4">
							<dt className="text-[#8C8C8C]">Database</dt>
							<dd>{getMongoDbName()}</dd>
						</div>
						<div className="flex justify-between gap-4">
							<dt className="text-[#8C8C8C]">Signed in as</dt>
							<dd>{user.email}</dd>
						</div>
					</dl>
				</section>

				<section className="rounded-3xl bg-[#1A1A1A] p-6 text-white">
					<p className="mb-6 text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
						Your permissions
					</p>
					<div className="flex flex-wrap gap-2">
						{permissions.map((permission) => (
							<span
								key={permission}
								className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/70"
							>
								{permission}
							</span>
						))}
					</div>
				</section>
			</div>
		</PageShell>
	)
}
