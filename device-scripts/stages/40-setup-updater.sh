#!/usr/bin/env bash
# Install bb-update agent + systemd timer that pulls OTA manifests with the device key.
set -euo pipefail

STAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${STAGE_DIR}/../lib/common.sh"

bb_require_root
bb_load_env
bb_require_cmd curl
bb_require_cmd python3

: "${BB_APP:?BB_APP required in machine.env}"
INTERVAL="${BB_UPDATE_INTERVAL:-15min}"
INSTALL_DIR="/opt/bear-and-berry"
AGENT_BIN="${INSTALL_DIR}/bin/bb-update.sh"
STATE_DIR="$(bb_state_dir)"

mkdir -p "${INSTALL_DIR}/bin" "${INSTALL_DIR}/ui" "${INSTALL_DIR}/api" "${INSTALL_DIR}/agent" "${STATE_DIR}"
chmod 700 "${INSTALL_DIR}" "${STATE_DIR}"

cat > "${AGENT_BIN}" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
STATE_DIR=/var/lib/bear-and-berry
# shellcheck source=/dev/null
source "${STATE_DIR}/machine.env"
KEY="$(tr -d '[:space:]' < "${STATE_DIR}/device.key")"
APP="${BB_APP%/}"
LOG="${STATE_DIR}/update.log"
TMP="$(mktemp -d /tmp/bb-update.XXXXXX)"
trap 'rm -rf "${TMP}"' EXIT
{
  echo "[$(date -Is)] checking updates"
  curl -fsS "${APP}/apis/devices/updates" -H "Authorization: Bearer ${KEY}" -H "Accept: application/json" -o "${TMP}/updates.json"
  python3 - "${TMP}/updates.json" "${TMP}" "${KEY}" <<'PY'
import json, hashlib, subprocess, pathlib, sys
payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
tmpdir = pathlib.Path(sys.argv[2])
key = sys.argv[3]
if not payload.get("ok"):
    raise SystemExit(payload.get("error") or "updates failed")
for item in payload.get("data", {}).get("updates") or []:
    component = item["component"]
    version = item["version"]
    sha = item["sha256"]
    url = item["url"]
    stamp = pathlib.Path(f"/var/lib/bear-and-berry/{component}.version")
    if stamp.exists() and stamp.read_text().strip() == version:
        print(f"skip {component}@{version}")
        continue
    dest = tmpdir / f"{component}.tgz"
    subprocess.check_call(["curl", "-fsS", url, "-H", f"Authorization: Bearer {key}", "-o", str(dest)])
    digest = hashlib.sha256(dest.read_bytes()).hexdigest()
    if digest != sha:
        raise SystemExit(f"checksum mismatch for {component}")
    target = pathlib.Path(f"/opt/bear-and-berry/{component}/versions/{version}")
    target.mkdir(parents=True, exist_ok=True)
    subprocess.check_call(["tar", "-xzf", str(dest), "-C", str(target)])
    current = pathlib.Path(f"/opt/bear-and-berry/{component}/current")
    if current.exists() or current.is_symlink():
        current.unlink()
    current.symlink_to(target)
    stamp.write_text(version + "\n")
    print(f"installed {component}@{version}")
PY
  date -Is > "${STATE_DIR}/last-update"
} >> "${LOG}" 2>&1
EOF
chmod 0700 "${AGENT_BIN}"

cat > "${INSTALL_DIR}/bin/bb-rotate-key.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
STATE_DIR=/var/lib/bear-and-berry
# shellcheck source=/dev/null
source "${STATE_DIR}/machine.env"
KEY="$(tr -d '[:space:]' < "${STATE_DIR}/device.key")"
TMP="$(mktemp)"
curl -fsS -X POST "${BB_APP%/}/apis/devices/rotate-key" \
  -H "Authorization: Bearer ${KEY}" -H "Accept: application/json" -o "${TMP}"
NEW="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d["data"]["deviceKey"])' "${TMP}")"
printf '%s\n' "${NEW}" > "${STATE_DIR}/device.key"
chmod 600 "${STATE_DIR}/device.key"
rm -f "${TMP}"
echo "device key rotated"
EOF
chmod 0700 "${INSTALL_DIR}/bin/bb-rotate-key.sh"

if command -v systemctl >/dev/null 2>&1; then
	cat > /etc/systemd/system/bb-update.service <<EOF
[Unit]
Description=Bear & Berry device update check
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=${AGENT_BIN}
Nice=10
EOF
	cat > /etc/systemd/system/bb-update.timer <<EOF
[Unit]
Description=Bear & Berry device update timer

[Timer]
OnBootSec=2min
OnUnitActiveSec=${INTERVAL}
AccuracySec=1min
Persistent=true

[Install]
WantedBy=timers.target
EOF
	systemctl daemon-reload
	systemctl enable --now bb-update.timer
fi

bb_report_state key_ready "updater installed"
bb_log "updater stage done (${INTERVAL})"
