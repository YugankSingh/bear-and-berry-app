import { getAppEnvironment, getMongoDbName } from "@/lib/env"
import { pingMongo } from "@/lib/mongodb"
import { ok } from "@/lib/api/response"

export async function GET() {
	let mongo = false
	try {
		mongo = await pingMongo()
	} catch {
		mongo = false
	}

	return ok({
		service: "bear-and-berry-app",
		environment: getAppEnvironment(),
		database: getMongoDbName(),
		mongo,
		timestamp: new Date().toISOString(),
	})
}
