"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import { toRoute } from "@/lib/auth/next-path"
import { ORGANIZATION_ROOT, organizationPath, swapOrganizationInPath } from "@/lib/auth/org-path"
import type { AccessibleOrg } from "@/types/domain"

type OrgSwitcherProps = {
	orgs: AccessibleOrg[]
	activeOrgSlug: string
	canAccessAdmin?: boolean
}

export function OrgSwitcher({ orgs, activeOrgSlug, canAccessAdmin = false }: OrgSwitcherProps) {
	const router = useRouter()
	const pathname = usePathname()
	const [pending, startTransition] = useTransition()

	function switchTo(value: string) {
		startTransition(() => {
			if (value === "admin") {
				router.push(toRoute("/admin"))
				return
			}
			if (value === "picker") {
				router.push(toRoute(ORGANIZATION_ROOT))
				return
			}
			router.push(toRoute(pathname.startsWith(`${ORGANIZATION_ROOT}/`) ? swapOrganizationInPath(pathname, value) : organizationPath(value)))
			router.refresh()
		})
	}

	if (orgs.length === 0 && !canAccessAdmin) {
		return null
	}

	return (
		<div>
			<label className="sr-only" htmlFor="org-switcher">
				Organization
			</label>
			<select
				id="org-switcher"
				disabled={pending}
				value={activeOrgSlug || (pathname.startsWith("/admin") ? "admin" : "picker")}
				onChange={(event) => switchTo(event.target.value)}
				className="max-w-[220px] rounded-full border border-[#ECEAE6] bg-white px-4 py-[10px] text-[13px] text-[#1A1A1A] outline-none"
			>
				<option value="picker">All organizations</option>
				{canAccessAdmin ? <option value="admin">Platform</option> : null}
				{orgs.map((org) => (
					<option key={org.id || org.slug} value={org.slug}>
						{org.name}
					</option>
				))}
			</select>
		</div>
	)
}
