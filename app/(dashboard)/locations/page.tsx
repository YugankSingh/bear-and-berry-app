import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { loadVisibleFleet } from "@/lib/auth/visible-fleet"
import { formatNumber, titleCase } from "@/lib/format"

export const metadata: Metadata = {
	title: "Locations",
}

export default async function LocationsPage() {
	const user = await getDashboardUser()
	let locations = [] as Awaited<ReturnType<typeof loadVisibleFleet>>["locations"]
	try {
		locations = (await loadVisibleFleet(user)).locations
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Locations"
			subtitle="Sites in your access scope — by organization or selected locations."
			permission="locations:read"
		>
			{locations.length === 0 ? (
				<EmptyState
					title="No locations in your scope"
					body="You only see locations granted by organization or an explicit location list."
				/>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{locations.map((location) => (
						<article key={location.id} className="rounded-3xl bg-white p-6 card-shadow">
							<div className="flex flex-wrap gap-2">
								<Badge>{titleCase(location.siteType)}</Badge>
								{location.tags.map((tag) => (
									<Badge key={tag} tone="neutral">
										{tag}
									</Badge>
								))}
							</div>
							<h2 className="mt-5 text-[22px] font-extrabold tracking-[-1px]">{location.name}</h2>
							<p className="mt-2 text-[14px] text-[#8C8C8C]">
								{location.city}
								{location.address ? ` · ${location.address}` : ""}
							</p>
							<p className="mt-6 text-[13px] text-[#555555]">
								{location.footfallDaily
									? `${formatNumber(location.footfallDaily)} daily footfall`
									: "Footfall not recorded"}
							</p>
						</article>
					))}
				</div>
			)}
		</PageShell>
	)
}
