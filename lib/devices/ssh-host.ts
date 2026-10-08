/** Hostname, IPv4, or IPv6 only — the value is pasted into a shell as `ssh user@<host>`. */
export const SSH_HOST_PATTERN = /^[A-Za-z0-9[][A-Za-z0-9.:[\]-]*$/

export function isValidSshHost(value: string | null | undefined): value is string {
	return typeof value === "string" && value.length <= 253 && SSH_HOST_PATTERN.test(value)
}

export function buildSshCommand(opsUsername: string, sshHost: string | null | undefined): string {
	return `ssh ${opsUsername}@${isValidSshHost(sshHost) ? sshHost : "<ssh-host>"}`
}
