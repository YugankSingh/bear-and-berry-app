#!/usr/bin/env bash
# Phase 1 entry: redeem pairing code, create ops SSH user, store device key. No purge/kiosk/updater.
set -euo pipefail

bb_log() { printf '[bb-device] %s\n' "$*"; }
bb_die() { printf '[bb-device] ERROR: %s\n' "$*" >&2; exit 1; }
bb_require_root() { [[ "${EUID}" -eq 0 ]] || bb_die "run as root (sudo)"; }
bb_require_cmd() { command -v "$1" >/dev/null 2>&1 || bb_die "missing required command: $1"; }

bb_require_root
bb_require_cmd curl
bb_require_cmd python3

: "${BB_APP:?set BB_APP to the Bear & Berry app base URL}"
BB_APP="${BB_APP%/}"
WORKDIR="$(mktemp -d /tmp/bb-bootstrap.XXXXXX)"
trap 'rm -rf "${WORKDIR}"' EXIT

if [[ -z "${BB_PAIRING_CODE:-}" ]]; then
	printf 'Enter 8-digit machine pairing code: '
	read -r BB_PAIRING_CODE
fi
BB_PAIRING_CODE="$(printf '%s' "${BB_PAIRING_CODE}" | tr -cd '0-9')"
[[ "${#BB_PAIRING_CODE}" -eq 8 ]] || bb_die "pairing code must be exactly 8 digits"

bb_log "pairing against ${BB_APP}"
curl -fsS -X POST "${BB_APP}/apis/devices/pair" \
	-H 'Content-Type: application/json' \
	-H 'Accept: application/json' \
	-d "{\"code\":\"${BB_PAIRING_CODE}\"}" \
	-o "${WORKDIR}/pair.json"

python3 - "${WORKDIR}/pair.json" "${WORKDIR}/env.sh" <<'PY'
import json, shlex, sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
if not payload.get("ok"):
    raise SystemExit(payload.get("error") or "pair failed")
data = payload["data"]
for key in ("opsUsername", "opsPassword", "deviceKey", "scriptsBaseUrl"):
    if not data.get(key):
        raise SystemExit(f"pair response missing {key}")
machine = data.get("machine") or {}
lines = [
    f"OPS_USERNAME={shlex.quote(str(data['opsUsername']))}",
    f"OPS_PASSWORD={shlex.quote(str(data['opsPassword']))}",
    f"DEVICE_KEY={shlex.quote(str(data['deviceKey']))}",
    f"SCRIPTS_BASE_URL={shlex.quote(str(data['scriptsBaseUrl']).rstrip('/'))}",
    f"BB_SSH_AUTHORIZED_KEYS={shlex.quote(str(data.get('sshAuthorizedKeys') or ''))}",
    f"MACHINE_ID={shlex.quote(str(machine.get('id') or ''))}",
    f"MACHINE_NAME={shlex.quote(str(machine.get('name') or ''))}",
    f"MACHINE_SERIAL={shlex.quote(str(machine.get('serialNumber') or ''))}",
]
out.write_text("\n".join(lines) + "\n")
PY

# shellcheck source=/dev/null
source "${WORKDIR}/env.sh"

bb_log "bound to ${MACHINE_NAME} (${MACHINE_SERIAL})"

# Pairing code is consumed on redeem — fetch stages with the new device key.
mkdir -p "${WORKDIR}/lib" "${WORKDIR}/stages" /var/lib/bear-and-berry /opt/bear-and-berry/bin
fetch_authed() {
	local name="$1"
	local dest="$2"
	curl -fsS "${SCRIPTS_BASE_URL}/${name}" \
		-H "Authorization: Bearer ${DEVICE_KEY}" \
		-o "${dest}"
}
fetch_authed "lib/common.sh" "${WORKDIR}/lib/common.sh"
fetch_authed "stages/10-ops-user.sh" "${WORKDIR}/stages/10-ops-user.sh"
fetch_authed "bin/bb-run" /opt/bear-and-berry/bin/bb-run
chmod 0755 "${WORKDIR}/stages/10-ops-user.sh" /opt/bear-and-berry/bin/bb-run
chmod 0644 "${WORKDIR}/lib/common.sh"

umask 077
cat > /var/lib/bear-and-berry/machine.env <<EOF
BB_APP=${BB_APP}
BB_MACHINE_ID=${MACHINE_ID}
BB_MACHINE_SERIAL=${MACHINE_SERIAL}
EOF
printf '%s\n' "${DEVICE_KEY}" > /var/lib/bear-and-berry/device.key
chmod 600 /var/lib/bear-and-berry/machine.env /var/lib/bear-and-berry/device.key
chmod 700 /var/lib/bear-and-berry

export BB_OPS_USERNAME="${OPS_USERNAME}"
export BB_OPS_PASSWORD="${OPS_PASSWORD}"
export BB_SSH_AUTHORIZED_KEYS
export BB_APP BB_MACHINE_ID

bb_log "running ops-user stage"
bash "${WORKDIR}/stages/10-ops-user.sh"

ln -sfn /opt/bear-and-berry/bin/bb-run /usr/local/bin/bb-run 2>/dev/null || true

# shellcheck source=/dev/null
source "${WORKDIR}/lib/common.sh"
bb_report_state key_ready "ops user and device key installed"

bb_log "bootstrap complete — SSH as ${OPS_USERNAME}"
bb_log "next: join WireGuard, set sshHost in admin, then bb-run purge-users / setup-kiosk / setup-updater"
