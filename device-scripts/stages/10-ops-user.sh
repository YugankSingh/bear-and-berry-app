#!/usr/bin/env bash
# Create sudo ops user from pair response, install SSH keys, enable sshd.
set -euo pipefail

STAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${STAGE_DIR}/../lib/common.sh"

bb_require_root

OPS_USER="${BB_OPS_USERNAME:?BB_OPS_USERNAME required}"
OPS_PASS="${BB_OPS_PASSWORD:?BB_OPS_PASSWORD required}"
KEYS="${BB_SSH_AUTHORIZED_KEYS:-}"

if ! id -u "${OPS_USER}" >/dev/null 2>&1; then
	bb_log "creating sudo user ${OPS_USER}"
	useradd --create-home --shell /bin/bash "${OPS_USER}"
fi

echo "${OPS_USER}:${OPS_PASS}" | chpasswd

if getent group sudo >/dev/null 2>&1; then
	usermod -aG sudo "${OPS_USER}"
elif getent group wheel >/dev/null 2>&1; then
	usermod -aG wheel "${OPS_USER}"
fi

# Passwordless sudo for ops recovery (still need password for SSH login).
echo "${OPS_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-${OPS_USER}"
chmod 440 "/etc/sudoers.d/90-${OPS_USER}"

HOME_DIR="$(getent passwd "${OPS_USER}" | cut -d: -f6)"
mkdir -p "${HOME_DIR}/.ssh"
if [[ -n "${KEYS}" ]]; then
	printf '%s\n' "${KEYS}" > "${HOME_DIR}/.ssh/authorized_keys"
	chmod 600 "${HOME_DIR}/.ssh/authorized_keys"
fi
chmod 700 "${HOME_DIR}/.ssh"
chown -R "${OPS_USER}:${OPS_USER}" "${HOME_DIR}/.ssh"

if command -v systemctl >/dev/null 2>&1; then
	systemctl enable --now ssh 2>/dev/null || systemctl enable --now sshd 2>/dev/null || true
fi

SSHD_CONFIG="/etc/ssh/sshd_config"
if [[ -f "${SSHD_CONFIG}" ]]; then
	grep -q '^PasswordAuthentication' "${SSHD_CONFIG}" || printf '\nPasswordAuthentication yes\n' >> "${SSHD_CONFIG}"
	grep -q '^PubkeyAuthentication' "${SSHD_CONFIG}" || printf '\nPubkeyAuthentication yes\n' >> "${SSHD_CONFIG}"
	if command -v systemctl >/dev/null 2>&1; then
		systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
	fi
fi

bb_log "ops user ${OPS_USER} ready"
