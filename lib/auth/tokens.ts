import { createHash, randomBytes, randomInt } from "crypto"
import { getAuthSecret, getInviteTtlDays } from "@/lib/env"

const OTP_TTL_MS = 15 * 60 * 1000

export function hashSecret(value: string): string {
	return createHash("sha256").update(`${getAuthSecret()}:${value}`).digest("hex")
}

export function createInviteToken(): { token: string; tokenHash: string; expiresAt: Date } {
	const token = randomBytes(32).toString("hex")
	const days = getInviteTtlDays()
	return {
		token,
		tokenHash: hashSecret(token),
		expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
	}
}

export function createEmailOtp(): { otp: string; otpHash: string; expiresAt: Date } {
	const otp = String(randomInt(0, 1_000_000)).padStart(6, "0")
	return {
		otp,
		otpHash: hashSecret(otp),
		expiresAt: new Date(Date.now() + OTP_TTL_MS),
	}
}

export function verifyHashedSecret(value: string, expectedHash: string | null | undefined): boolean {
	if (!expectedHash) {
		return false
	}
	return hashSecret(value) === expectedHash
}
