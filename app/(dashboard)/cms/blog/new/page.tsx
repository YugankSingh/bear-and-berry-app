import type { Metadata } from "next"
import { PageShell } from "@/components/layout/page-shell"
import { BlogEditor } from "@/components/cms/blog-editor"
import { requireVendforgeCms } from "@/lib/auth/require-auth"

export const metadata: Metadata = {
	title: "New blog post",
}

export default async function NewBlogPostPage() {
	await requireVendforgeCms("cms:write")
	return (
		<PageShell
			title="New post"
			subtitle="Publish to the Bear & Berry landing page. Drafts are not visible on the site."
			permission="cms:write"
		>
			<div className="rounded-3xl bg-[#F8F6F2] p-1">
				<BlogEditor />
			</div>
		</PageShell>
	)
}
