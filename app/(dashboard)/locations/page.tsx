import type { Metadata } from "next"
import { PageShell } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { listLocations } from "@/lib/repositories/locations"
import { formatNumber, titleCase } from "@/lib/format"

export const metadata: Metadata = {
	title: "Locations",
}

export default async function LocationsPage() {
	let locations = [] as Awaited<ReturnType<typeof listLocations>>
	try {
		locations = await listLocations()
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Locations"
			subtitle="Offices, gyms, campuses, and retail sites hosting a Bear & Berry machine."
			permission="locations:read"
		>
			{locations.length === 0 ? (
				<EmptyState
					title="No locations yet"
					body="Add a site with city, footfall, and type so machines can be assigned."
				/>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{locations.map((location) => (
						<article key={location.id} className="rounded-3xl bg-white p-6 card-shadow">
							<Badge>{titleCase(location.siteType)}</Badge>
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
