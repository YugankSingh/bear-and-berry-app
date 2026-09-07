"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BrandLockup } from "@/components/brand/brand-lockup"
import type { NavItem } from "@/lib/auth/rbac"
import { toRoute } from "@/lib/auth/next-path"
import { ORGANIZATION_ROOT, organizationPath } from "@/lib/auth/org-path"
import type { SessionUser } from "@/types/domain"
import { titleCase } from "@/lib/format"

type SidebarProps = {
	user: SessionUser
	items: readonly NavItem[]
	workspace: "admin" | "org"
	orgId?: string
}

export function Sidebar({ user, items, workspace, orgId }: SidebarProps) {
	const pathname = usePathname()
	const org = user.accessibleOrgs.find((item) => item.slug === (orgId || user.activeOrgSlug))

	return (
		<aside className="flex h-full w-[220px] shrink-0 flex-col bg-[#1A1A1A] text-white lg:w-[248px]">
			<div className="px-4 pb-4 pt-5">
				<div className="rounded-2xl bg-[#F8F6F2] px-3 py-3">
					<BrandLockup size="sm" />
					<p className="mt-2 px-0.5 text-[10px] uppercase tracking-[1.8px] text-[#1A1A1A]/40">
						{workspace === "admin" ? "Platform" : org?.name || "Organization"}
					</p>
				</div>
			</div>

			<nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
				{items.map((item) => {
					const href = workspace === "org" && orgId ? organizationPath(orgId, item.href) : item.href
					const active =
						item.href === "/admin"
							? pathname === "/admin"
							: pathname === href || pathname.startsWith(`${href}/`)
					return (
						<Link
							key={item.href}
							href={toRoute(href)}
							className={`flex items-center justify-between rounded-2xl px-4 py-[11px] text-[13.5px] transition-colors duration-200 ${
								active
									? "bg-white text-[#1A1A1A]"
									: "text-white/55 hover:bg-white/[0.06] hover:text-white"
							}`}
						>
							<span>{item.label}</span>
							{active ? <span className="h-1.5 w-1.5 rounded-full bg-[#BD0C16]" /> : null}
						</Link>
					)
				})}
			</nav>

			<div className="shrink-0 space-y-3 border-t border-white/[0.08] px-6 py-5">
				{workspace === "org" ? (
					<Link href={toRoute(ORGANIZATION_ROOT)} className="block text-[12px] text-white/45 hover:text-white">
						All organizations
					</Link>
				) : null}
				{workspace === "org" && user.canAccessAdmin ? (
					<Link href={toRoute("/admin")} className="block text-[12px] text-white/45 hover:text-white">
						Open platform
					</Link>
				) : null}
				{workspace === "admin" ? (
					<Link href={toRoute(ORGANIZATION_ROOT)} className="block text-[12px] text-white/45 hover:text-white">
						Organizations
					</Link>
				) : null}
				<div>
					<p className="truncate text-[13px] font-medium text-white">{user.name}</p>
					<p className="mt-1 text-[11px] uppercase tracking-[1.4px] text-white/35">
						{user.roleName || titleCase(user.role)}
					</p>
				</div>
			</div>
		</aside>
	)
}
