import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { StatCard } from "@/components/ui/stat-card"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
import { formatNumber } from "@/lib/format"

export const metadata: Metadata = {
	title: "Revenue",
}

export default async function RevenuePage() {
	const user = await getDashboardUser()
	let machines = [] as Awaited<ReturnType<typeof loadVisibleFleet>>["machines"]
	try {
		machines = (await loadVisibleFleet(user)).machines
	} catch (error) {
		console.error(error)
	}

	const cupsToday = machines.reduce((sum, machine) => sum + machine.cupsToday, 0)
	const assumedPrice = 149
	const estimated = cupsToday * assumedPrice
	const maxCups = Math.max(...machines.map((machine) => machine.cupsToday), 1)

	return (
		<PageShell
			title="Revenue"
			subtitle="Pours and estimated take for machines in your access scope."
			permission="revenue:read"
		>
			<div className="grid gap-4 md:grid-cols-3">
				<StatCard eyebrow="Estimated today" value={`₹${formatNumber(estimated)}`} detail="At ₹149 per cup" dark />
				<StatCard eyebrow="Pours today" value={formatNumber(cupsToday)} detail="Across assigned machines" />
				<StatCard
					eyebrow="Active units"
					value={formatNumber(machines.filter((machine) => machine.status === "online").length)}
					detail="Currently reporting online"
				/>
			</div>

			<section className="mt-6 rounded-3xl bg-white p-6 card-shadow">
				<p className="mb-8 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
					Pours by machine
				</p>
				<div className="space-y-5">
					{machines.map((machine) => (
						<div key={machine.id}>
							<div className="mb-2 flex items-center justify-between text-[13px]">
								<span>{machine.name}</span>
								<span className="text-[#8C8C8C]">{formatNumber(machine.cupsToday)}</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-[#F8F6F2]">
								<div
									className="h-full rounded-full bg-[#BD0C16]"
									style={{ width: `${Math.round((machine.cupsToday / maxCups) * 100)}%` }}
								/>
							</div>
						</div>
					))}
					{machines.length === 0 ? (
						<p className="text-[14px] text-[#8C8C8C]">Revenue appears once machines start reporting pours.</p>
					) : null}
				</div>
			</section>
		</PageShell>
	)
}
