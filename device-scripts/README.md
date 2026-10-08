# Device bootstrap scripts

Served by `GET /apis/devices/scripts/...` from this folder (or `DEVICE_SCRIPTS_DIR`).

## Phase 1 (initial pair only)

```bash
export BB_APP="https://app.bearandberry.in"
curl -fsSL "$BB_APP/apis/devices/scripts/bootstrap.sh" | sudo -E bash
```

Creates ops sudo user + password (from pair API), writes `/var/lib/bear-and-berry/device.key`, installs `bb-run`. Does **not** purge, kiosk, or updater.

Then join WireGuard and set `sshHost` in Machines UI. See [WIREGUARD.md](./WIREGUARD.md).

## Later stages (separate calls)

```bash
sudo bb-run purge-users
sudo bb-run setup-kiosk
sudo bb-run setup-updater
sudo bb-run debloat
sudo bb-run encryption-gate   # only if BB_REQUIRE_DISK_ENCRYPTION=1
```

`bb-run` uses the device API key (Bearer) to fetch scripts. Rotate key with `/opt/bear-and-berry/bin/bb-rotate-key.sh` after updater is installed.

## OTA bundles

Publish under `device-releases/<component>/`:

- `manifest.json` — `{ "version", "sha256", "filename" }`
- tarball named in `filename`

Components: `ui`, `api`, `agent`. Device polls `GET /apis/devices/updates` with the device key.
