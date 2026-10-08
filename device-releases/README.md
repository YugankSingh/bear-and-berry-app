# Device OTA releases

Layout:

```text
device-releases/
  ui/
    manifest.json
    device-ui-v0.1.0.tar.gz
  api/
    manifest.json
    device-api-v0.1.0.tar.gz
  agent/
    manifest.json
    …
```

Example `manifest.json`:

```json
{
  "version": "0.1.0",
  "sha256": "<sha256 of the tarball>",
  "filename": "device-ui-v0.1.0.tar.gz"
}
```

Authenticated devices list updates via `GET /apis/devices/updates` and download via `GET /apis/devices/updates/:component/download`.

Override root with `DEVICE_RELEASES_DIR`.
