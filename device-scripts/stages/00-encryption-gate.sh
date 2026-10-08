#!/usr/bin/env bash
# Fail if root disk is not encrypted. Default OFF via BB_REQUIRE_DISK_ENCRYPTION=0.
set -euo pipefail

STAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${STAGE_DIR}/../lib/common.sh"

bb_require_root

if ! bb_bool "${BB_REQUIRE_DISK_ENCRYPTION:-0}"; then
	bb_log "encryption gate skipped (BB_REQUIRE_DISK_ENCRYPTION=0)"
	exit 0
fi

if lsblk -o TYPE,NAME,MOUNTPOINT 2>/dev/null | grep -q crypt; then
	bb_log "encrypted volume detected"
	exit 0
fi

if grep -Eq 'type\s*=\s*luks|/dev/mapper/' /etc/crypttab 2>/dev/null; then
	bb_log "crypttab indicates LUKS"
	exit 0
fi

bb_die "root disk does not appear encrypted; refuse to continue"
