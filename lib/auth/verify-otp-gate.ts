export type VerifyOtpGateUser = {
	emailVerified?: boolean
	emailOtpExpiresAt?: Date | null
	emailOtpHash?: string | null
}

export type VerifyOtpGateResult =
	| { ok: true }
	| { ok: false; status: 401 | 409; error: string }

export function authorizeVerifyOtp(
	user: VerifyOtpGateUser,
	otp: string,
	verifySecret: (otp: string, hash: string | null | undefined) => boolean,
	now = Date.now(),
): VerifyOtpGateResult {
	if (user.emailVerified) {
		return { ok: false, status: 409, error: "This email is already verified. Sign in instead." }
	}
	if (!user.emailOtpExpiresAt || user.emailOtpExpiresAt.getTime() < now) {
		return { ok: false, status: 401, error: "That code has expired. Request a new one." }
	}
	if (!verifySecret(otp, user.emailOtpHash)) {
		return { ok: false, status: 401, error: "That code does not match." }
	}
	return { ok: true }
}
