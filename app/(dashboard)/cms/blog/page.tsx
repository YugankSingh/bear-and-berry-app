import type { Metadata } from "next"
import Link from "next/link"
import { PageShell } from "@/components/layout/page-shell"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { listBlogPosts } from "@/lib/repositories/blogs"
import { requireVendforgeCms } from "@/lib/auth/require-auth"
import { hasPermission } from "@/lib/auth/permissions"
import { toRoute } from "@/lib/auth/next-path"
import { formatDate, titleCase } from "@/lib/format"

export const metadata: Metadata = {
	title: "Blog CMS",
}

export default async function BlogCmsPage() {
	const user = await requireVendforgeCms("cms:read")
	const canWrite = hasPermission(user, "cms:write")
	let posts = [] as Awaited<ReturnType<typeof listBlogPosts>>
	try {
		posts = await listBlogPosts()
	} catch (error) {
		console.error(error)
	}

	return (
		<PageShell
			title="Blog CMS"
			subtitle="VendForge Labs publishing for bearandberry.in. Drafts stay private. Publishing refreshes the cached landing-page article."
			permission="cms:read"
		>
			{canWrite ? (
				<div className="mb-6 flex justify-end">
					<Link
						href={toRoute("/admin/cms/blog/new")}
						className="rounded-full bg-[#BD0C16] px-6 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12]"
					>
						New post
					</Link>
				</div>
			) : null}
			{posts.length === 0 ? (
				<EmptyState
					title="No posts yet"
					body="Write the first guide and publish it. The landing page will pick it up on the next refresh."
				/>
			) : (
				<div className="overflow-hidden rounded-3xl bg-white card-shadow">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-[#ECEAE6] text-[11px] uppercase tracking-[2px] text-[#8C8C8C]">
								<th className="px-6 py-4 font-semibold">Post</th>
								<th className="px-6 py-4 font-semibold">Status</th>
								<th className="px-6 py-4 font-semibold">Updated</th>
							</tr>
						</thead>
						<tbody>
							{posts.map((post) => (
								<tr key={post.id} className="border-b border-[#ECEAE6] last:border-0">
									<td className="px-6 py-5">
										{canWrite ? (
											<Link href={toRoute(`/admin/cms/blog/${post.id}`)} className="text-[14px] font-medium text-[#1A1A1A]">
												{post.title}
											</Link>
										) : (
											<p className="text-[14px] font-medium text-[#1A1A1A]">{post.title}</p>
										)}
										<p className="mt-1 text-[12px] text-[#8C8C8C]">/{post.slug}</p>
									</td>
									<td className="px-6 py-5">
										<Badge tone={post.status === "published" ? "berry" : "neutral"}>
											{titleCase(post.status)}
										</Badge>
									</td>
									<td className="px-6 py-5 text-[13px] text-[#8C8C8C]">{formatDate(post.updatedAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</PageShell>
	)
}
