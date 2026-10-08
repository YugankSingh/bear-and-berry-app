#!/usr/bin/env bash
# Create locked-down kiosk user with autologin into minimal Openbox + Chromium.
set -euo pipefail

STAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${STAGE_DIR}/../lib/common.sh"

bb_require_root
bb_load_env

KIOSK_USER="${BB_KIOSK_USER:-bb-kiosk}"
UI_URL="${BB_UI_URL:-http://127.0.0.1:4173}"

if ! id -u "${KIOSK_USER}" >/dev/null 2>&1; then
	bb_log "creating kiosk user ${KIOSK_USER}"
	useradd --create-home --shell /usr/sbin/nologin "${KIOSK_USER}" || \
		useradd --create-home --shell /bin/false "${KIOSK_USER}"
fi

# No sudo for kiosk
passwd -l "${KIOSK_USER}" >/dev/null 2>&1 || true

HOME_DIR="$(getent passwd "${KIOSK_USER}" | cut -d: -f6)"
mkdir -p "${HOME_DIR}/.config/openbox" /etc/systemd/system/getty@tty1.service.d

BROWSER="chromium"
command -v chromium >/dev/null 2>&1 || BROWSER="chromium-browser"
command -v "${BROWSER}" >/dev/null 2>&1 || BROWSER="chromium"

cat > "${HOME_DIR}/.config/openbox/autostart" <<EOF
xset -dpms
xset s off
xset s noblank
${BROWSER} --kiosk --noerrdialogs --disableinfobars --check-for-update-interval=31536000 ${UI_URL} &
EOF
chown -R "${KIOSK_USER}:${KIOSK_USER}" "${HOME_DIR}/.config"

# Autologin on tty1
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${KIOSK_USER} --noclear %I \$TERM
EOF

# Startx on login via .bash_profile if shell allows; prefer a systemd user unit when available.
if [[ "$(getent passwd "${KIOSK_USER}" | cut -d: -f7)" == *nologin* ]] || [[ "$(getent passwd "${KIOSK_USER}" | cut -d: -f7)" == *false* ]]; then
	usermod -s /bin/bash "${KIOSK_USER}"
fi
cat > "${HOME_DIR}/.bash_profile" <<'EOF'
if [[ -z "${DISPLAY}" ]] && [[ "$(tty)" == /dev/tty1 ]]; then
  exec startx /usr/bin/openbox-session
fi
EOF
chown "${KIOSK_USER}:${KIOSK_USER}" "${HOME_DIR}/.bash_profile"

# Deny kiosk read of privileged trees
chmod 700 /opt/bear-and-berry /var/lib/bear-and-berry 2>/dev/null || true
chown root:root /opt/bear-and-berry /var/lib/bear-and-berry 2>/dev/null || true

systemctl daemon-reload || true
bb_report_state kiosk_ready "kiosk user configured"
bb_log "kiosk stage done"
