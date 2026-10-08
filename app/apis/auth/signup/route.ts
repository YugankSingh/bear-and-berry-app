import { signupSchema } from "@/lib/validations/auth"
import { bootstrapFirstAdmin } from "@/lib/auth/bootstrap"
import { isUserRemoved } from "@/lib/auth/access"
import { nextAuthStep } from "@/lib/auth/lookup"
import { createEmailOtp } from "@/lib/auth/tokens"
import { establishSession } from "@/lib/auth/session"
import { sendSignupOtpEmail } from "@/lib/mail/auth-mail"
import { countUsers, createUser, findUserByEmail, updateUser } from "@/lib/repositories/users"
import { fail, ok } from "@/lib/api/response"
import { handleApiError, readJson } from "@/lib/api/guard"

export async function POST(request: Request) {
	try {
		const body = signupSchema.parse(await readJson(request))
		const existing = await findUserByEmail(body.email)

		if (existing) {
			if (isUserRemoved(existing)) {
				return fail("CONFLICT", "This email is no longer active. Ask an admin to send a new invitation.", 409)
			}
			const next = nextAuthStep(existing)
			if (next === "invite_pending") {
				return fail("CONFLICT", "This email already has an invitation. Check your inbox.", 409)
			}
			if (next === "invite_expired") {
				return fail("CONFLICT", "Your invitation expired. Ask an admin to send a new one.", 409)
			}
			if (next === "verify") {
				return fail("CONFLICT", "This email is waiting for a verification code.", 409)
			}
			return fail("CONFLICT", "An account with that email already exists. Sign in instead.", 409)
		}

		if ((await countUsers()) === 0) {
			const user = await bootstrapFirstAdmin({
				email: body.email,
				password: body.password,
				name: body.name,
			})
			if (user) {
				const { record } = await establishSession(user)
				return ok({
					user: record,
					accessStatus: record.accessStatus,
					needsVerification: false,
				}, 201)
			}
		}

		const created = await createUser({
			name: body.name,
			email: body.email,
			password: body.password,
			role: "",
			orgId: null,
			orgSlug: "",
			memberships: [],
			extraGrants: [],
			tags: [],
			accessStatus: "waitlisted",
			emailVerified: false,
			passwordReady: true,
		})

		const otp = createEmailOtp()
		await updateUser(created.id, {
			emailOtpHash: otp.otpHash,
			emailOtpExpiresAt: otp.expiresAt,
		})
		const sent = await sendSignupOtpEmail({
			to: created.email,
			name: created.name,
			otp: otp.otp,
		})

		return ok({
			user: { id: created.id, email: created.email, name: created.name },
			accessStatus: "waitlisted" as const,
			needsVerification: true,
			otpSent: sent,
		}, 201)
	} catch (error) {
		return handleApiError(error)
	}
}
