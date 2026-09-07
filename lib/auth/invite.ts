import { sendInviteEmail } from "@/lib/mail/auth-mail"
import { createInviteToken } from "@/lib/auth/tokens"
import { findUserById, updateUser } from "@/lib/repositories/users"

export async function issueInvite(userId: string): Promise<{ sent: boolean; expiresAt: Date }> {
	const user = await findUserById(userId)
	if (!user) {
		throw new Error("User not found")
	}

	const invite = createInviteToken()
	await updateUser(userId, {
		accessStatus: "pending_invite",
		inviteTokenHash: invite.tokenHash,
		inviteExpiresAt: invite.expiresAt,
		inviteAcceptedAt: null,
	})

	const sent = await sendInviteEmail({
		to: user.email,
		name: user.name,
		token: invite.token,
	})

	return { sent, expiresAt: invite.expiresAt }
}
