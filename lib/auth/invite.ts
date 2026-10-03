import { after } from "next/server"
import { sendInviteEmail } from "@/lib/mail/auth-mail"
import { createInviteToken } from "@/lib/auth/tokens"
import { updateUser, type UserPatchInput } from "@/lib/repositories/users"
import type { UserRecord } from "@/types/domain"

export function scheduleInviteEmail(input: { to: string; name: string; token: string }): void {
	after(async () => {
		try {
			await sendInviteEmail(input)
		} catch (error) {
			console.error("invite email failed", error)
		}
	})
}

/** One DB write for invite token (+ optional patch), then email via `after()`. */
export async function issueInvite(
	userId: string,
	options: {
		email: string
		name: string
		patch?: UserPatchInput
	},
): Promise<{ user: UserRecord; expiresAt: Date }> {
	const invite = createInviteToken()
	const user = await updateUser(userId, {
		...options.patch,
		accessStatus: "pending_invite",
		inviteTokenHash: invite.tokenHash,
		inviteExpiresAt: invite.expiresAt,
		inviteAcceptedAt: null,
	})
	if (!user) {
		throw new Error("User not found")
	}

	scheduleInviteEmail({
		to: options.email,
		name: options.name,
		token: invite.token,
	})

	return { user, expiresAt: invite.expiresAt }
}
