import type { Metadata } from "next"
import { PageShell } from "@/components/layout/page-shell"
import { getDeveloperDiagnostics } from "@/lib/env"

export const metadata: Metadata = {
	title: "Developer",
}

export default function DeveloperPage() {
	const diagnostics = getDeveloperDiagnostics()
	const rows = [
		{ label: "APP_ENV", value: diagnostics.appEnv },
		{ label: "Database", value: diagnostics.database },
		{ label: "Self URL", value: diagnostics.selfUrl },
		{ label: "Landing URL", value: diagnostics.landingUrl },
		{ label: "Session TTL", value: `${diagnostics.sessionTtlDays} days` },
		{ label: "Invite TTL", value: `${diagnostics.inviteTtlDays} days` },
		{ label: "SMTP", value: diagnostics.smtpConfigured ? "Configured" : "Not configured" },
		{ label: "SMTP host", value: `${diagnostics.smtpHost}:${diagnostics.smtpPort}` },
		{ label: "CORS origins", value: diagnostics.corsOrigins.join(", ") || "—" },
	]

	return (
		<PageShell
			title="Developer"
			subtitle="Runtime and database details. This page is hidden from normal settings."
			permission="developer:read"
		>
			<section className="rounded-3xl bg-white p-6 card-shadow">
				<p className="mb-6 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
					Diagnostics
				</p>
				<dl className="divide-y divide-[#ECEAE6]">
					{rows.map((row) => (
						<div key={row.label} className="flex justify-between gap-6 py-4 text-[14px] first:pt-0 last:pb-0">
							<dt className="text-[#8C8C8C]">{row.label}</dt>
							<dd className="text-right text-[#1A1A1A]">{row.value}</dd>
						</div>
					))}
				</dl>
			</section>
		</PageShell>
	)
}
