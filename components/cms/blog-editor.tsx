"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toRoute } from "@/lib/auth/next-path"
import type { BlogPostRecord, BlogStatus } from "@/types/cms"

type BlogEditorProps = {
	post?: BlogPostRecord
}

export function BlogEditor({ post }: BlogEditorProps) {
	const router = useRouter()
	const [title, setTitle] = useState(post?.title ?? "")
	const [slug, setSlug] = useState(post?.slug ?? "")
	const [description, setDescription] = useState(post?.description ?? "")
	const [useTitleAsMetaTitle, setUseTitleAsMetaTitle] = useState(
		!post?.metaTitle || post.metaTitle === post.title,
	)
	const [metaTitle, setMetaTitle] = useState(post?.metaTitle && post.metaTitle !== post.title ? post.metaTitle : "")
	const [metaDescription, setMetaDescription] = useState(
		post?.metaDescription && post.metaDescription !== post.description ? post.metaDescription : "",
	)
	const [category, setCategory] = useState(post?.category ?? "Guides")
	const [status, setStatus] = useState<BlogStatus>(post?.status ?? "draft")
	const [body, setBody] = useState(post?.content ?? "")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setLoading(true)
		setError("")
		const payload = {
			title,
			slug,
			description,
			metaTitle: useTitleAsMetaTitle ? title : metaTitle,
			metaDescription: metaDescription.trim() || description,
			category,
			status,
			content: body,
		}
		const response = await fetch(post ? `/apis/cms/blog/${post.id}` : "/apis/cms/blog", {
			method: post ? "PATCH" : "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		})
		const result = (await response.json()) as { ok: boolean; error?: string }
		setLoading(false)
		if (!result.ok) {
			setError(result.error ?? "Could not save the post.")
			return
		}
		router.push(toRoute("/admin/cms/blog"))
		router.refresh()
	}

	return (
		<form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
			<input
				required
				value={title}
				onChange={(event) => setTitle(event.target.value)}
				placeholder="Title"
				className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3 text-[16px] outline-none"
			/>
			<label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3">
				<span>
					<span className="block text-[14px] text-[#1A1A1A]">Use same as title</span>
					<span className="mt-1 block text-[12px] text-[#8C8C8C]">Meta title matches the post title.</span>
				</span>
				<input
					type="checkbox"
					checked={useTitleAsMetaTitle}
					onChange={(event) => setUseTitleAsMetaTitle(event.target.checked)}
					className="h-5 w-5 accent-[#BD0C16]"
				/>
			</label>
			{useTitleAsMetaTitle ? null : (
				<input
					required
					value={metaTitle}
					onChange={(event) => setMetaTitle(event.target.value)}
					placeholder="Meta title"
					className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3 text-[14px] outline-none"
				/>
			)}
			<div className="grid gap-3 md:grid-cols-2">
				<input
					required
					value={slug}
					onChange={(event) => setSlug(event.target.value)}
					placeholder="url-slug"
					className="rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3 text-[14px] outline-none"
				/>
				<input
					required
					value={category}
					onChange={(event) => setCategory(event.target.value)}
					placeholder="Category"
					className="rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3 text-[14px] outline-none"
				/>
				<select
					value={status}
					onChange={(event) => setStatus(event.target.value as BlogStatus)}
					className="rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3 text-[14px] outline-none"
				>
					<option value="draft">Draft</option>
					<option value="published">Published</option>
				</select>
			</div>
			<textarea
				required
				value={description}
				onChange={(event) => setDescription(event.target.value)}
				placeholder="Short description for cards"
				rows={3}
				className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3 text-[14px] outline-none"
			/>
			<textarea
				value={metaDescription}
				onChange={(event) => setMetaDescription(event.target.value)}
				placeholder="Meta description (optional — uses the short description if empty)"
				rows={3}
				className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3 text-[14px] outline-none"
			/>
			<textarea
				required
				value={body}
				onChange={(event) => setBody(event.target.value)}
				placeholder={"## Heading\n\nParagraph with **bold** or [a link](/pricing).\n\n- List item"}
				rows={16}
				className="w-full rounded-2xl border border-[#ECEAE6] bg-white px-5 py-3 font-mono text-[13px] outline-none"
			/>
			<p className="text-[12px] text-[#8C8C8C]">
				Body is Markdown — headings, lists, links, and emphasis are all supported.
			</p>
			{error ? <p className="text-[13px] text-[#BD0C16]">{error}</p> : null}
			<button
				type="submit"
				disabled={loading}
				className="rounded-full bg-[#BD0C16] px-7 py-3 text-[13px] font-medium text-white hover:bg-[#a00a12] disabled:opacity-50"
			>
				{loading ? "Saving…" : post ? "Update post" : "Create post"}
			</button>
		</form>
	)
}
