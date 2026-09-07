import { resendOtpSchema } from "@/lib/validations/auth"
import { createEmailOtp } from "@/lib/auth/tokens"
import { sendSignupOtpEmail } from "@/lib/mail/auth-mail"
import { isUserLive } from "@/lib/auth/access"
import { findUserByEmail, updateUser } from "@/lib/repositories/users"
import { ensureDatabaseReady } from "@/lib/seed"
import { ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function POST(request: Request) {
	try {
		await ensureDatabaseReady()
		const body = resendOtpSchema.parse(await readJson(request))
		const user = await findUserByEmail(body.email)
		if (!isUserLive(user) || user.emailVerified) {
			return ok({ otpSent: true })
		}

		const otp = createEmailOtp()
		await updateUser(user._id.toHexString(), {
			emailOtpHash: otp.otpHash,
			emailOtpExpiresAt: otp.expiresAt,
		})
		const otpSent = await sendSignupOtpEmail({
			to: user.email,
			name: user.name,
			otp: otp.otp,
		})
		return ok({ otpSent })
	} catch (error) {
		return handleApiError(error)
	}
}
