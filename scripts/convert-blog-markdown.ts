import { readFileSync } from "node:fs"
import { MongoClient } from "mongodb"

type LegacyBlock =
	| { type: "p"; text: string }
	| { type: "h2"; text: string }
	| { type: "list"; items: string[] }

function loadEnv(path: string): void {
	for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith("#")) {
			continue
		}
		const index = trimmed.indexOf("=")
		if (index < 1) {
			continue
		}
		const key = trimmed.slice(0, index).trim()
		let value = trimmed.slice(index + 1).trim()
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1)
		}
		process.env[key] = value
	}
}

function isLegacyBlock(value: unknown): value is LegacyBlock {
	if (!value || typeof value !== "object" || !("type" in value)) {
		return false
	}
	const block = value as { type?: unknown; text?: unknown; items?: unknown }
	if (block.type === "p" || block.type === "h2") {
		return typeof block.text === "string"
	}
	return block.type === "list" && Array.isArray(block.items)
}

function blocksToMarkdown(content: unknown): string | null {
	if (typeof content === "string") {
		return null
	}
	if (!Array.isArray(content)) {
		return ""
	}
	return content
		.filter(isLegacyBlock)
		.map((block) => {
			if (block.type === "h2") {
				return `## ${block.text}`
			}
			if (block.type === "list") {
				return block.items.map((item) => `- ${item}`).join("\n")
			}
			return block.text
		})
		.filter((chunk) => chunk.length > 0)
		.join("\n\n")
}

const DATABASE_BY_ENV: Record<string, string> = {
	development: "bear_and_berry_staging",
	staging: "bear_and_berry_staging",
	production: "bear_and_berry_prod",
}

async function main(): Promise<void> {
	const envPath = process.argv[2]
	if (!envPath) {
		throw new Error("Usage: tsx scripts/convert-blog-markdown.ts <env-file>")
	}
	loadEnv(envPath)
	const uri = process.env.MONGODB_URI
	const env = process.env.APP_ENV ?? "development"
	const dbName = DATABASE_BY_ENV[env]
	if (!uri || !dbName) {
		throw new Error(`Missing Mongo settings for ${envPath}`)
	}

	const client = new MongoClient(uri, {
		serverSelectionTimeoutMS: 8000,
		connectTimeoutMS: 8000,
	})
	await client.connect()
	const blogs = client.db(dbName).collection("blog_posts")
	const docs = await blogs.find({}).project({ slug: 1, content: 1 }).toArray()
	let converted = 0
	for (const doc of docs) {
		const markdown = blocksToMarkdown(doc.content)
		if (markdown === null) {
			continue
		}
		await blogs.updateOne({ _id: doc._id }, { $set: { content: markdown } })
		converted += 1
		console.log(`converted ${doc.slug}`)
	}
	console.log(`${envPath}: ${converted}/${docs.length} posts converted in ${dbName}`)
	await client.close()
}

void main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
