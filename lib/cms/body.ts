import type { BlogContentBlock } from "@/types/cms"

export function parseBlogBody(raw: string): BlogContentBlock[] {
	const chunks = raw
		.split(/\n\s*\n/)
		.map((chunk) => chunk.trim())
		.filter((chunk) => chunk.length > 0)

	return chunks.map((chunk) => {
		if (chunk.startsWith("# ")) {
			return { type: "h2", text: chunk.replace(/^#\s+/, "").trim() }
		}
		const lines = chunk.split("\n")
		if (lines.every((line) => line.trim().startsWith("- "))) {
			return {
				type: "list",
				items: lines.map((line) => line.replace(/^\s*-\s+/, "").trim()),
			}
		}
		return { type: "p", text: chunk.replace(/\n/g, " ") }
	})
}

export function serializeBlogBody(blocks: BlogContentBlock[]): string {
	return blocks
		.map((block) => {
			if (block.type === "h2") {
				return `# ${block.text}`
			}
			if (block.type === "list") {
				return block.items.map((item) => `- ${item}`).join("\n")
			}
			return block.text
		})
		.join("\n\n")
}
