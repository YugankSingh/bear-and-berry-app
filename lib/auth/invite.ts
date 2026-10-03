import { after } from "next/server"
import { sendInviteEmail } from "@/lib/mail/auth-mail"
import { createInviteToken } from "@/lib/auth/tokens"
import { updateUser, type UserPatchInput } from "@/lib/repositories/users"
import type { UserRecord } from "@/types/domain"

export type InviteIssueResult = {
	user: UserRecord
	expiresAt: Date
	token: string
}

export function prepareInviteToken(): {
	token: string
	tokenHash: string
	expiresAt: Date
} {
	const invite = createInviteToken()
	return {
		token: invite.token,
		tokenHash: invite.tokenHash,
		expiresAt: invite.expiresAt,
	}
}

export function scheduleInviteEmail(input: { to: string; name: string; token: string }): void {
	after(async () => {
		try {
			await sendInviteEmail(input)
		} catch (error) {
			console.error("invite email failed", error)
		}
	})
}

/** Single write for invite token (+ optional patch fields), then email via after(). */
export async function issueInvite(
	userId: string,
	options: {
		email: string
		name: string
		patch?: UserPatchInput
	},
): Promise<InviteIssueResult> {
	const invite = prepareInviteToken()
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

	return { user, expiresAt: invite.expiresAt, token: invite.token }
}
