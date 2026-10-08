#!/usr/bin/env bash
# Remove other interactive users; keep root + ops (+ optional kiosk).
set -euo pipefail

STAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${STAGE_DIR}/../lib/common.sh"

bb_require_root
bb_load_env

KEEP_USER="${BB_OPS_USERNAME:-}"
if [[ -z "${KEEP_USER}" && -f /var/lib/bear-and-berry/machine.env ]]; then
	# Prefer the only bb-* sudo-ish user if env missing.
	KEEP_USER="$(awk -F: '$3>=1000 && $1 ~ /^bb-/ {print $1; exit}' /etc/passwd || true)"
fi
KEEP_KIOSK="${BB_KIOSK_USER:-bb-kiosk}"
KEEP_EXTRA="${BB_PURGE_KEEP:-}"

if ! bb_bool "${BB_PURGE_USERS:-1}"; then
	bb_log "purge skipped (BB_PURGE_USERS=0)"
	exit 0
fi

[[ -n "${KEEP_USER}" ]] || bb_die "ops username unknown; set BB_OPS_USERNAME"

bb_log "purging users except root, ${KEEP_USER}, ${KEEP_KIOSK}"
keep_set="root ${KEEP_USER} ${KEEP_KIOSK} ${KEEP_EXTRA}"
while IFS=: read -r name _ uid _ _ _ shell; do
	[[ "${uid}" -ge 1000 ]] || continue
	case "${shell}" in
		*/nologin|*/false) continue ;;
	esac
	skip=0
	for k in ${keep_set}; do
		if [[ "${name}" == "${k}" ]]; then
			skip=1
			break
		fi
	done
	[[ "${skip}" -eq 1 ]] && continue
	bb_log "removing user ${name}"
	userdel -r "${name}" 2>/dev/null || userdel "${name}" || true
done < /etc/passwd

bb_report_state hardened "other interactive users purged"
bb_log "purge stage done"
