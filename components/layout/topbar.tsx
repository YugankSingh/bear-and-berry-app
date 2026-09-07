"use client"

import { useRouter } from "next/navigation"
import { getAppEnvironmentLabel } from "@/lib/env-client"
import { OrgSwitcher } from "@/components/layout/org-switcher"
import type { SessionUser } from "@/types/domain"

type TopbarProps = {
	title: string
	subtitle: string
	user: SessionUser
	environment: "development" | "staging" | "production"
	workspace?: "admin" | "org"
}

export function Topbar({ title, subtitle, user, environment, workspace = "org" }: TopbarProps) {
	const router = useRouter()

	async function signOut() {
		await fetch("/apis/auth/logout", { method: "POST" })
		router.push("/login")
		router.refresh()
	}

	return (
		<header className="flex items-start justify-between gap-6 px-8 pb-2 pt-8 md:px-10">
			<div>
				<p className="mb-3 text-[11px] font-semibold uppercase tracking-[3px] text-[#8C8C8C]">
					{getAppEnvironmentLabel(environment)}
				</p>
				<h1 className="text-[36px] font-extrabold tracking-[-2px] leading-none text-[#1A1A1A]">
					{title}
				</h1>
				<p className="mt-3 max-w-xl text-[14px] leading-[1.7] text-[#8C8C8C]">{subtitle}</p>
			</div>
			<div className="flex items-center gap-3 pt-2">
				{workspace === "org" || user.canAccessAdmin ? (
					<OrgSwitcher
						orgs={user.accessibleOrgs}
						activeOrgSlug={user.activeOrgSlug}
						canAccessAdmin={user.canAccessAdmin}
					/>
				) : null}
				<div className="hidden text-right sm:block">
					<p className="text-[13px] font-medium text-[#1A1A1A]">{user.name}</p>
					<p className="text-[12px] text-[#8C8C8C]">{user.email}</p>
				</div>
				<button
					type="button"
					onClick={() => void signOut()}
					className="rounded-full border border-[#ECEAE6] px-5 py-[11px] text-[13px] text-[#1A1A1A]/50 transition-colors hover:text-[#1A1A1A]"
				>
					Sign out
				</button>
			</div>
		</header>
	)
}
