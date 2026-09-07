import type { Metadata } from "next"
import { PageShell, getDashboardUser } from "@/components/layout/page-shell"
import { RolesEditor } from "@/components/settings/roles-editor"
import { hasPermission, isSystemAdmin } from "@/lib/auth/permissions"
import { listPermissionCatalog, listRoles } from "@/lib/repositories/roles"

export const metadata: Metadata = {
	title: "Roles",
}

export default async function AdminRolesPage() {
	const user = await getDashboardUser()
	const canEditRoles = hasPermission(user, "roles:write") && isSystemAdmin(user)
	let roles = [] as Awaited<ReturnType<typeof listRoles>>
	let catalog = [] as Awaited<ReturnType<typeof listPermissionCatalog>>
	try {
		;[roles, catalog] = await Promise.all([listRoles(), listPermissionCatalog()])
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Roles"
			subtitle="Roles are templates. A membership binds a role to an organization, all organizations (*), or an organization tag."
			permission="roles:read"
		>
			{canEditRoles ? (
				<RolesEditor roles={roles} catalog={catalog} />
			) : (
				<p className="text-[14px] text-[#8C8C8C]">You can view roles, but only a system admin can change them.</p>
			)}
		</PageShell>
	)
}
