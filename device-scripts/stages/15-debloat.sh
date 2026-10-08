#!/usr/bin/env bash
# Remove KDE/Plasma desktop bloat; install minimal kiosk stack packages if missing.
set -euo pipefail

STAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${STAGE_DIR}/../lib/common.sh"

bb_require_root

if ! command -v apt-get >/dev/null 2>&1; then
	bb_log "apt-get not found — skip debloat on this image"
	exit 0
fi

export DEBIAN_FRONTEND=noninteractive
bb_log "removing common KDE/Plasma packages (best-effort)"
apt-get update -y || true
# shellcheck disable=SC2086
apt-get purge -y \
	plasma-desktop plasma-workspace plasma-discover kde-plasma-desktop \
	kde-standard kde-runtime dolphin konsole kate 2>/dev/null || true
apt-get autoremove -y || true

bb_log "ensuring minimal kiosk dependencies"
apt-get install -y --no-install-recommends \
	openbox xorg chromium chromium-browser openssh-server network-manager 2>/dev/null \
	|| apt-get install -y --no-install-recommends openbox xorg openssh-server network-manager || true

bb_log "debloat stage done"
