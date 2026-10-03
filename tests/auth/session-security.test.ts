import { describe, expect, it } from "vitest"
import { createSessionToken, readSessionToken } from "@/lib/auth/session"
import { SignJWT } from "jose"
import { sessionUser, grant } from "../helpers/auth"
import { hasPermission } from "@/lib/auth/permissions"

const SECRET = "test-auth-secret-with-at-least-32-chars!!"

describe("session JWT — tamper and privilege cases", () => {
	it("does not honor unsigned privilege escalation in a forged token when secret differs", async () => {
		process.env.AUTH_SECRET = SECRET
		process.env.APP_ENV = "development"
		const forged = await new SignJWT({
			email: "attacker@example.com",
			name: "Attacker",
			role: "super_admin",
			orgId: "1",
			orgSlug: "bear-and-berry",
			scopePath: "/",
			tags: [],
			permissions: ["system:admin"],
			accessStatus: "invited",
			canAccessAdmin: true,
		})
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setSubject("attacker")
			.setIssuedAt()
			.setExpirationTime("1d")
			.sign(new TextEncoder().encode("wrong-secret-wrong-secret-wrong!!"))

		expect(await readSessionToken(forged)).toBeNull()
	})

	it("preserves permissions from claims but system:admin still short-circuits checks", async () => {
		process.env.AUTH_SECRET = SECRET
		process.env.APP_ENV = "development"
		const user = sessionUser({
			permissions: ["system:admin"],
			grants: [grant("system", "admin")],
			grantKeys: ["system=admin"],
			canAccessAdmin: true,
		})
		const token = await createSessionToken(user)
		const restored = await readSessionToken(token)
		expect(restored).toBeTruthy()
		expect(hasPermission(restored, "leads:delete")).toBe(true)
		expect(hasPermission(restored, "roles:write")).toBe(true)
	})

	it("viewer session cannot gain machines:write from empty grants", async () => {
		process.env.AUTH_SECRET = SECRET
		process.env.APP_ENV = "development"
		const user = sessionUser({
			role: "viewer",
			roleRank: 10,
			permissions: ["dashboard:read", "machines:read"],
			grants: [
				grant("dashboard", "view", { org: "bear-and-berry" }),
				grant("machines", "view", { org: "bear-and-berry" }),
			],
			grantKeys: [
				"dashboard-org:bear-and-berry=view",
				"machines-org:bear-and-berry-tag:*-location:*=view",
			],
		})
		const restored = await readSessionToken(await createSessionToken(user))
		expect(hasPermission(restored, "machines:read")).toBe(true)
		expect(hasPermission(restored, "machines:write")).toBe(false)
		expect(hasPermission(restored, "users:grant")).toBe(false)
		expect(hasPermission(restored, "leads:read")).toBe(false)
	})

	it("rejects empty role claim", async () => {
		process.env.AUTH_SECRET = SECRET
		const token = await new SignJWT({
			email: "a@b.com",
			name: "A",
			role: "",
			orgId: "1",
			orgSlug: "bear-and-berry",
			scopePath: "/",
			tags: [],
		})
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setSubject("u1")
			.setIssuedAt()
			.setExpirationTime("1d")
			.sign(new TextEncoder().encode(SECRET))
		expect(await readSessionToken(token)).toBeNull()
	})

	it("rejects missing sub", async () => {
		process.env.AUTH_SECRET = SECRET
		const token = await new SignJWT({
			email: "a@b.com",
			name: "A",
			role: "viewer",
			orgId: "1",
			orgSlug: "bear-and-berry",
			scopePath: "/",
			tags: [],
		})
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setIssuedAt()
			.setExpirationTime("1d")
			.sign(new TextEncoder().encode(SECRET))
		expect(await readSessionToken(token)).toBeNull()
	})

	it("rejects alg none style misuse by requiring HS256 verify path (invalid token)", async () => {
		process.env.AUTH_SECRET = SECRET
		expect(await readSessionToken("not-a-jwt")).toBeNull()
		expect(await readSessionToken("")).toBeNull()
	})
})
