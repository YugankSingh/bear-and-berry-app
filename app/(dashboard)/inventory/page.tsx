import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { loadVisibleInventory } from "@/lib/auth/visible-fleet"

export const metadata: Metadata = {
	title: "Inventory",
}

export default async function InventoryPage() {
	const user = await getDashboardUser()
	let slots = [] as Awaited<ReturnType<typeof loadVisibleInventory>>
	try {
		slots = await loadVisibleInventory(user)
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Inventory"
			subtitle="Ingredient slots on machines you can access."
			permission="inventory:read"
		>
			{slots.length === 0 ? (
				<EmptyState
					title="No inventory in your scope"
					body="Slots appear for machines granted by organization, location, unit, or tag."
				/>
			) : (
				<div className="overflow-hidden rounded-3xl bg-white card-shadow">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
								<th className="px-6 py-4 font-semibold">Machine</th>
								<th className="px-6 py-4 font-semibold">Slot</th>
								<th className="px-6 py-4 font-semibold">Ingredient</th>
								<th className="px-6 py-4 font-semibold">Level</th>
							</tr>
						</thead>
						<tbody>
							{slots.map((slot) => {
								const ratio = slot.capacity === 0 ? 0 : slot.quantity / slot.capacity
								return (
									<tr key={slot.id} className="border-b border-[#ECEAE6] last:border-0">
										<td className="px-6 py-5 text-[14px]">{slot.machineName}</td>
										<td className="px-6 py-5 text-[13px] text-[#8C8C8C]">0{slot.slotIndex}</td>
										<td className="px-6 py-5">
											<p className="text-[14px]">{slot.label}</p>
											<p className="mt-1 text-[12px] uppercase tracking-[1px] text-[#8C8C8C]">
												{slot.sku}
											</p>
										</td>
										<td className="px-6 py-5">
											<div className="mb-2 h-1.5 w-40 overflow-hidden rounded-full bg-[#F8F6F2]">
												<div
													className={`h-full rounded-full ${ratio <= 0.25 ? "bg-[#BD0C16]" : "bg-[#1A1A1A]"}`}
													style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
												/>
											</div>
											<p className="text-[12px] text-[#8C8C8C]">
												{slot.quantity} / {slot.capacity}
											</p>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}
		</PageShell>
	)
}
