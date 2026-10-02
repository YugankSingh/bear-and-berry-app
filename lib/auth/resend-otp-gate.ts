import { isUserLive } from "@/lib/auth/access"

export type ResendOtpGateUser = {
	isActive?: boolean
	deletedAt?: Date | string | null
	emailVerified?: boolean
}

export function shouldResendOtp(user: ResendOtpGateUser | null | undefined): boolean {
	if (!isUserLive(user) || user.emailVerified) {
		return false
	}
	return true
}
