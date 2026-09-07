"use client"

import { useRouter } from "next/navigation"
import { toRoute } from "@/lib/auth/next-path"
import { organizationPath } from "@/lib/auth/org-path"

export function OrgOpenButton({ orgSlug }: { orgSlug: string }) {
	const router = useRouter()

	return (
		<button
			type="button"
			onClick={() => router.push(toRoute(organizationPath(orgSlug)))}
			className="rounded-full border border-[#ECEAE6] px-4 py-2 text-[13px] text-[#1A1A1A]/70 hover:text-[#1A1A1A]"
		>
			Open
		</button>
	)
}
