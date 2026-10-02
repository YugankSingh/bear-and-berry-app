import { describe, expect, it } from "vitest"
import { SignJWT, jwtVerify } from "jose"
import { createSessionToken, readSessionToken } from "@/lib/auth/session"
import { sessionUser } from "../helpers/auth"

const SECRET = "test-auth-secret-with-at-least-32-chars!!"

describe("session JWT", () => {
	it("round-trips a signed session without inventing permissions", async () => {
		process.env.AUTH_SECRET = SECRET
		process.env.APP_ENV = "development"
		process.env.SESSION_TTL_DAYS = "7"

		const user = sessionUser({
			permissions: ["dashboard:read", "machines:read"],
			grants: [],
			canAccessAdmin: false,
		})
		const token = await createSessionToken(user)
		const restored = await readSessionToken(token)
		expect(restored?.id).toBe(user.id)
		expect(restored?.email).toBe(user.email)
		expect(restored?.permissions).toEqual(expect.arrayContaining(["dashboard:read", "machines:read"]))
		expect(restored?.permissions).not.toContain("system:admin")
	})

	it("rejects tokens signed with the wrong secret", async () => {
		process.env.AUTH_SECRET = SECRET
		const token = await new SignJWT({
			email: "x@example.com",
			name: "X",
			role: "viewer",
			orgId: "1",
			orgSlug: "bear-and-berry",
			scopePath: "/",
			tags: [],
		})
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setSubject("u1")
			.setIssuedAt()
			.setExpirationTime("1d")
			.sign(new TextEncoder().encode("totally-different-secret-value-here!!"))

		expect(await readSessionToken(token)).toBeNull()
	})

	it("rejects tokens missing required claims", async () => {
		process.env.AUTH_SECRET = SECRET
		const token = await new SignJWT({ email: "x@example.com" })
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setSubject("u1")
			.setIssuedAt()
			.setExpirationTime("1d")
			.sign(new TextEncoder().encode(SECRET))
		expect(await readSessionToken(token)).toBeNull()
	})

	it("rejects expired tokens", async () => {
		process.env.AUTH_SECRET = SECRET
		const token = await new SignJWT({
			email: "x@example.com",
			name: "X",
			role: "viewer",
			orgId: "1",
			orgSlug: "bear-and-berry",
			scopePath: "/",
			tags: [],
		})
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setSubject("u1")
			.setIssuedAt(Math.floor(Date.now() / 1000) - 120)
			.setExpirationTime(Math.floor(Date.now() / 1000) - 60)
			.sign(new TextEncoder().encode(SECRET))
		expect(await readSessionToken(token)).toBeNull()
	})

	it("accepts a valid token through jose directly", async () => {
		process.env.AUTH_SECRET = SECRET
		const user = sessionUser()
		const token = await createSessionToken(user)
		const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET), {
			algorithms: ["HS256"],
		})
		expect(payload.sub).toBe(user.id)
	})
})
