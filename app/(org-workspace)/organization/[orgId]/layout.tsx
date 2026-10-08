import { hasDashboardAccess } from "@/lib/auth/access"
import { redirectTo } from "@/lib/auth/next-path"
import { getSessionUser, hasSessionCookie } from "@/lib/auth/session"
import { visibleNavItems } from "@/lib/auth/rbac"
import { getAppEnvironment } from "@/lib/env"
import { organizationPageFromPath, organizationPath, PATH_HEADER, resolveAccessibleOrg } from "@/lib/auth/workspace"
import { Sidebar } from "@/components/layout/sidebar"
import { ViewportLock } from "@/components/layout/viewport-lock"
import { headers } from "next/headers"
import { hasOrgWildcard } from "@/lib/auth/grants"
import { findOrganizationBySlug } from "@/lib/repositories/organizations"
import type { AccessibleOrg, SessionUser } from "@/types/domain"

/** All-org users may open orgs created after their session was issued. */
async function resolveOrgForWildcard(user: SessionUser, orgId: string): Promise<AccessibleOrg | null> {
	if (!hasOrgWildcard(user.grants)) {
		return null
	}
	const doc = await findOrganizationBySlug(orgId)
	return doc ? { id: doc._id.toHexString(), slug: doc.slug, name: doc.name, tags: doc.tags } : null
}

export const dynamic = "force-dynamic"

type OrgLayoutProps = {
	children: React.ReactNode
	params: Promise<{ orgId: string }>
}

export default async function OrganizationWorkspaceLayout({ children, params }: OrgLayoutProps) {
	const user = await getSessionUser()
	if (!user) {
		redirectTo((await hasSessionCookie()) ? "/apis/auth/logout" : "/login")
	}
	if (!hasDashboardAccess(user.accessStatus)) {
		redirectTo("/waitlist")
	}

	const { orgId } = await params
	const org = resolveAccessibleOrg(user, orgId) ?? (await resolveOrgForWildcard(user, orgId))
	if (!org) {
		redirectTo("/organization")
	}

	const pathname = (await headers()).get(PATH_HEADER) ?? ""
	if (org.slug !== orgId) {
		redirectTo(organizationPath(org.slug, organizationPageFromPath(pathname)))
	}

	return (
		<div className="flex h-dvh overflow-hidden bg-[#F8F6F2]">
			<ViewportLock />
			<Sidebar
				user={{ ...user, activeOrgSlug: org.slug }}
				items={visibleNavItems(user, "org")}
				workspace="org"
				orgId={org.slug}
			/>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">
				<div className="hidden" data-environment={getAppEnvironment()} />
				<main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin pb-12">
					{children}
				</main>
			</div>
		</div>
	)
}
