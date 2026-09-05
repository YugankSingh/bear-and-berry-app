"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BrandLockup } from "@/components/brand/brand-lockup"
import type { NavItem } from "@/lib/auth/rbac"
import type { SessionUser } from "@/types/domain"
import { titleCase } from "@/lib/format"

type SidebarProps = {
	user: SessionUser
	items: readonly NavItem[]
}

export function Sidebar({ user, items }: SidebarProps) {
	const pathname = usePathname()

	return (
		<aside className="flex h-screen w-[248px] shrink-0 flex-col bg-[#1A1A1A] text-white">
			<div className="px-4 pb-4 pt-5">
				<div className="rounded-2xl bg-[#F8F6F2] px-3 py-3">
					<BrandLockup size="sm" />
					<p className="mt-2 px-0.5 text-[10px] uppercase tracking-[1.8px] text-[#1A1A1A]/40">
						Operator
					</p>
				</div>
			</div>

			<nav className="flex-1 space-y-1 px-3">
				{items.map((item) => {
					const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
					return (
						<Link
							key={item.href}
							href={item.href}
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

			<div className="border-t border-white/[0.08] px-6 py-5">
				<p className="truncate text-[13px] font-medium text-white">{user.name}</p>
				<p className="mt-1 text-[11px] uppercase tracking-[1.4px] text-white/35">
					{titleCase(user.role)}
				</p>
			</div>
		</aside>
	)
}
