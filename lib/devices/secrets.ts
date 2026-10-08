import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { getAuthSecret } from "@/lib/env"

const PREFIX = "v1"

function deriveKey(): Buffer {
	return createHash("sha256").update(`device-secrets:${getAuthSecret()}`).digest()
}

/** Encrypt a secret for storage on MachineDocument (AES-256-GCM). */
export function encryptDeviceSecret(plaintext: string): string {
	const iv = randomBytes(12)
	const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv)
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
	const tag = cipher.getAuthTag()
	return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".")
}

export function decryptDeviceSecret(payload: string): string {
	const [version, ivB64, tagB64, dataB64] = payload.split(".")
	if (version !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
		throw new Error("Invalid encrypted secret payload")
	}
	const decipher = createDecipheriv("aes-256-gcm", deriveKey(), Buffer.from(ivB64, "base64url"))
	decipher.setAuthTag(Buffer.from(tagB64, "base64url"))
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(dataB64, "base64url")),
		decipher.final(),
	])
	return decrypted.toString("utf8")
}
