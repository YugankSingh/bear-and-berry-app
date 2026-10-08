#!/usr/bin/env bash
# Shared helpers for Bear & Berry device stages.
set -euo pipefail

bb_log() {
	printf '[bb-device] %s\n' "$*"
}

bb_die() {
	printf '[bb-device] ERROR: %s\n' "$*" >&2
	exit 1
}

bb_require_root() {
	if [[ "${EUID}" -ne 0 ]]; then
		bb_die "run as root (sudo)"
	fi
}

bb_require_cmd() {
	command -v "$1" >/dev/null 2>&1 || bb_die "missing required command: $1"
}

bb_bool() {
	case "${1:-0}" in
		1|true|TRUE|yes|YES|on|ON) return 0 ;;
		*) return 1 ;;
	esac
}

bb_state_dir() {
	printf '%s' /var/lib/bear-and-berry
}

bb_load_env() {
	local env_file
	env_file="$(bb_state_dir)/machine.env"
	if [[ -f "${env_file}" ]]; then
		# shellcheck source=/dev/null
		source "${env_file}"
	fi
}

bb_device_key() {
	local key_file
	key_file="$(bb_state_dir)/device.key"
	[[ -f "${key_file}" ]] || bb_die "device key missing at ${key_file}"
	tr -d '[:space:]' < "${key_file}"
}

bb_report_state() {
	local state="$1"
	local message="${2:-}"
	bb_load_env
	: "${BB_APP:?BB_APP missing}"
	local key
	key="$(bb_device_key)"
	curl -fsS -X POST "${BB_APP%/}/apis/devices/heartbeat" \
		-H "Authorization: Bearer ${key}" \
		-H "Content-Type: application/json" \
		-d "{\"installState\":\"${state}\",\"message\":$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "${message}")}" \
		>/dev/null || bb_log "warning: failed to report state ${state}"
}
