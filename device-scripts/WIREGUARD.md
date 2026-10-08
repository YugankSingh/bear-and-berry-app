# WireGuard VPS runbook (Phase 1)

Use a small VPS (Hetzner / Netcup / similar) as the **only** remote path into machines. No Tailscale. Policies stay in Bear & Berry.

## 1. Server (once)

```bash
sudo apt update && sudo apt install -y wireguard
umask 077
wg genkey | tee /etc/wireguard/server.key | wg pubkey > /etc/wireguard/server.pub
```

`/etc/wireguard/wg0.conf` (example):

```ini
[Interface]
Address = 10.10.0.1/24
ListenPort = 51820
PrivateKey = <server private key>
PostUp = sysctl -w net.ipv4.ip_forward=1
PostDown = sysctl -w net.ipv4.ip_forward=0

# Add a [Peer] block per machine (see below)
```

```bash
sudo systemctl enable --now wg-quick@wg0
sudo ufw allow 51820/udp   # if using ufw
```

## 2. Per machine peer

On the VPS:

```bash
wg genkey | tee machine-N.key | wg pubkey > machine-N.pub
```

Append to `wg0.conf`:

```ini
[Peer]
PublicKey = <machine-N.pub>
AllowedIPs = 10.10.0.N/32
```

```bash
sudo wg syncconf wg0 <(wg-quick strip wg0)
```

On the Radxa (after bootstrap / over local SSH), install peer config, e.g. `/etc/wireguard/wg0.conf`:

```ini
[Interface]
Address = 10.10.0.N/32
PrivateKey = <machine-N private key>
DNS = 1.1.1.1

[Peer]
PublicKey = <server.pub>
Endpoint = <vps-public-ip>:51820
AllowedIPs = 10.10.0.0/24
PersistentKeepalive = 25
```

```bash
sudo apt install -y wireguard
sudo systemctl enable --now wg-quick@wg0
```

## 3. Dashboard

1. Machines → Device panel → set **SSH host** to `10.10.0.N` → Save  
2. Reveal password → **Copy SSH**  
3. From your laptop (also a WG peer, or SSH jump via the VPS):

```bash
ssh bb-xxxxxx@10.10.0.N
```

Laptop as peer: same pattern with its own `10.10.0.2` (or SSH to the VPS then hop).

## 4. Later automation

A future `bb-run` stage can drop the peer config using a one-time secret from the cloud; Phase 1 keeps this manual so SSH foothold stays simple.
