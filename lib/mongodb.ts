import { MongoClient, type Db } from "mongodb"
import { getMongoDbName, getMongoUri } from "@/lib/env"

const globalForMongo = globalThis as typeof globalThis & {
	__bbMongoClient?: MongoClient
	__bbMongoPromise?: Promise<MongoClient>
}

async function getClient(): Promise<MongoClient> {
	if (globalForMongo.__bbMongoClient) {
		return globalForMongo.__bbMongoClient
	}

	if (!globalForMongo.__bbMongoPromise) {
		const client = new MongoClient(getMongoUri(), {
			serverSelectionTimeoutMS: 3000,
			connectTimeoutMS: 3000,
		})
		globalForMongo.__bbMongoPromise = client.connect().then((connected) => {
			globalForMongo.__bbMongoClient = connected
			return connected
		})
	}

	return globalForMongo.__bbMongoPromise
}

export async function getDb(): Promise<Db> {
	const client = await getClient()
	return client.db(getMongoDbName())
}

export async function pingMongo(): Promise<boolean> {
	try {
		const db = await getDb()
		await db.command({ ping: 1 })
		return true
	} catch {
		return false
	}
}
