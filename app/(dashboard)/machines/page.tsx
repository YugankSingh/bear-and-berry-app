import type { Metadata } from "next"
import { PageShell } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { listMachines } from "@/lib/repositories/machines"
import { formatNumber, titleCase } from "@/lib/format"

export const metadata: Metadata = {
	title: "Machines",
}

export default async function MachinesPage() {
	let machines = [] as Awaited<ReturnType<typeof listMachines>>
	try {
		machines = await listMachines()
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Machines"
			subtitle="BB-01 units, site assignment, and live operating status."
			permission="machines:read"
		>
			{machines.length === 0 ? (
				<EmptyState
					title="No machines yet"
					body="Provision a BB-01 and assign it to a location. Demo machines appear automatically after the first admin seed."
				/>
			) : (
				<div className="overflow-hidden rounded-3xl bg-white card-shadow">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
								<th className="px-6 py-4 font-semibold">Unit</th>
								<th className="px-6 py-4 font-semibold">Location</th>
								<th className="px-6 py-4 font-semibold">Status</th>
								<th className="px-6 py-4 font-semibold">Uptime</th>
								<th className="px-6 py-4 font-semibold">Cups today</th>
							</tr>
						</thead>
						<tbody>
							{machines.map((machine) => (
								<tr key={machine.id} className="border-b border-[#ECEAE6] last:border-0">
									<td className="px-6 py-5">
										<p className="text-[14px] font-medium">{machine.name}</p>
										<p className="mt-1 text-[12px] text-[#8C8C8C]">
											{machine.model} · {machine.serialNumber}
										</p>
									</td>
									<td className="px-6 py-5 text-[13px] text-[#555555]">
										{machine.locationName ?? "Unassigned"}
									</td>
									<td className="px-6 py-5">
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
									</td>
									<td className="px-6 py-5 text-[13px]">{machine.uptimePercent.toFixed(1)}%</td>
									<td className="px-6 py-5 text-[13px]">{formatNumber(machine.cupsToday)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</PageShell>
	)
}
