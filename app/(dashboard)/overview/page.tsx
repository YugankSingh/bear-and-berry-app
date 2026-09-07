import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import { countLeadsByStatus, listLeads } from "@/lib/repositories/leads"
import { loadVisibleFleet, loadVisibleInventory } from "@/lib/auth/visible-fleet"
import { formatNumber, formatDateTime, titleCase } from "@/lib/format"
import { getAppEnvironment, getMongoDbName } from "@/lib/env"
import type { MachineRecord, MachineStatus } from "@/types/domain"

export const metadata: Metadata = {
	title: "Overview",
}

export default async function OverviewPage() {
	const user = await getDashboardUser()
	let machineCounts: Record<MachineStatus, number> = { online: 0, offline: 0, maintenance: 0, error: 0 }
	let cupsToday = 0
	let leadCounts = { new: 0, contacted: 0, qualified: 0, closed: 0 }
	let lowInventory = 0
	let machines = [] as MachineRecord[]
	let leads = [] as Awaited<ReturnType<typeof listLeads>>
	let loadError: string | null = null

	try {
		const [fleet, slots, leadStatus, inbound] = await Promise.all([
			loadVisibleFleet(user),
			loadVisibleInventory(user),
			countLeadsByStatus(),
			listLeads(),
		])
		machines = fleet.machines
		for (const machine of machines) {
			machineCounts[machine.status] += 1
			cupsToday += machine.cupsToday
		}
		lowInventory = slots.filter((slot) => slot.capacity > 0 && slot.quantity / slot.capacity <= 0.25).length
		leadCounts = leadStatus
		leads = inbound
	} catch (error) {
		console.error(error)
		loadError = "MongoDB is not reachable yet. Start the database and refresh."
	}

	const fleetSize = Object.values(machineCounts).reduce((sum, count) => sum + count, 0)

	return (
		<PageShell
			title="Overview"
			subtitle="Live fleet health, inbound demand, and the machines that need attention today."
			permission="dashboard:read"
		>
			{loadError ? (
				<div className="mb-6 rounded-2xl border border-[#BD0C16]/20 bg-[#BD0C16]/5 px-5 py-4 text-[13px] text-[#BD0C16]">
					{loadError}
				</div>
			) : null}

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatCard
					eyebrow="Fleet"
					value={formatNumber(machineCounts.online)}
					detail={`${formatNumber(fleetSize)} machines · ${machineCounts.maintenance} in service`}
					dark
				/>
				<StatCard
					eyebrow="Cups today"
					value={formatNumber(cupsToday)}
					detail="Fresh pours across the live fleet"
				/>
				<StatCard
					eyebrow="New leads"
					value={formatNumber(leadCounts.new)}
					detail={`${formatNumber(leadCounts.qualified)} qualified · ${formatNumber(leadCounts.contacted)} in conversation`}
				/>
				<StatCard
					eyebrow="Low inventory"
					value={formatNumber(lowInventory)}
					detail="Slots at or below 25% capacity"
				/>
			</div>

			<div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
				<section className="rounded-3xl bg-white p-6 card-shadow">
					<p className="mb-6 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
						Machines
					</p>
					<div className="space-y-4">
						{machines.slice(0, 6).map((machine) => (
							<div key={machine.id} className="flex items-center justify-between gap-4">
								<div>
									<p className="text-[15px] font-medium text-[#1A1A1A]">{machine.name}</p>
									<p className="mt-1 text-[13px] text-[#8C8C8C]">
										{machine.locationName ?? "Unassigned"} · {machine.serialNumber}
									</p>
								</div>
								<div className="text-right">
									<Badge
										tone={
											machine.status === "online"
												? "success"
												: machine.status === "error"
													? "danger"
													: "warn"
										}
									>
										{titleCase(machine.status)}
									</Badge>
									<p className="mt-2 text-[12px] text-[#8C8C8C]">
										{formatNumber(machine.cupsToday)} cups
									</p>
								</div>
							</div>
						))}
						{machines.length === 0 ? (
							<p className="text-[14px] text-[#8C8C8C]">No machines have been provisioned yet.</p>
						) : null}
					</div>
				</section>

				<section className="rounded-3xl bg-[#2D1C18] p-6 text-white">
					<p className="mb-6 text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
						Latest inbound
					</p>
					<div className="space-y-5">
						{leads.slice(0, 4).map((lead) => (
							<div key={lead.id}>
								<p className="text-[15px] font-medium">{lead.name ?? lead.email}</p>
								<p className="mt-1 text-[13px] text-white/50">
									{titleCase(lead.intent)} · {lead.location ?? "No city yet"}
								</p>
								<p className="mt-1 text-[12px] text-white/35">{formatDateTime(lead.createdAt)}</p>
							</div>
						))}
						{leads.length === 0 ? (
							<p className="text-[14px] text-white/50">No leads ingested yet.</p>
						) : null}
					</div>
					<p className="mt-10 text-[12px] text-white/35">
						{titleCase(getAppEnvironment())} · {getMongoDbName()}
					</p>
				</section>
			</div>
		</PageShell>
	)
}
