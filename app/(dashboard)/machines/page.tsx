import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { MachineTagsEditor } from "@/components/machines/machine-tags-editor"
import { MachineDevicePanel } from "@/components/machines/machine-device-panel"
import { AddMachineForm } from "@/components/machines/add-machine-form"
import { hasPermission } from "@/lib/auth/rbac"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
import { formatNumber, titleCase } from "@/lib/format"

export const metadata: Metadata = {
	title: "Machines",
}

export default async function MachinesPage() {
	const user = await getDashboardUser()
	const canEdit = hasPermission(user, "machines:write")
	const canPair = hasPermission(user, "devices:pair")
	let machines = [] as Awaited<ReturnType<typeof loadVisibleFleet>>["machines"]
	let locations = [] as Awaited<ReturnType<typeof loadVisibleFleet>>["locations"]
	try {
		const fleet = await loadVisibleFleet(user)
		machines = fleet.machines
		locations = fleet.locations
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Machines"
			subtitle="BB-01 units you can see, including tags used for access."
			permission="machines:read"
		>
			{canEdit && user.activeOrgSlug ? (
				<div className="mb-6">
					<AddMachineForm orgSlug={user.activeOrgSlug} locations={locations} />
				</div>
			) : null}
			{machines.length === 0 ? (
				<EmptyState
					title="No machines in your scope"
					body="You only see machines granted by organization, location, unit, or tag."
				/>
			) : (
				<div className="overflow-hidden rounded-3xl bg-white card-shadow">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
								<th className="px-6 py-4 font-semibold">Unit</th>
								<th className="px-6 py-4 font-semibold">Location</th>
								<th className="px-6 py-4 font-semibold">Status</th>
								<th className="px-6 py-4 font-semibold">Tags</th>
								<th className="px-6 py-4 font-semibold">Device</th>
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
									<td className="px-6 py-5">
										<MachineTagsEditor
											machineId={machine.id}
											tags={machine.tags}
											canEdit={canEdit}
										/>
									</td>
									<td className="px-6 py-5">
										<MachineDevicePanel
											machineId={machine.id}
											machineName={machine.name}
											installState={machine.installState}
											opsUsername={machine.opsUsername}
											sshHost={machine.sshHost}
											hasOpsPassword={machine.hasOpsPassword}
											canPair={canPair}
										/>
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
