# SwiftFleet production deployment

**Domain:** `swiftfleet.africa`  
**Server:** `62.171.186.126`  
**NPM:** https://nginx-manager.netlabs.africa/nginx/proxy

## Port allocation (verified free on server)

| Service | Host bind | NPM |
|---------|-----------|-----|
| **Frontend** (Next.js) | `127.0.0.1:3300` | **Proxy here** |
| Backend API (debug) | `127.0.0.1:4300` | Not exposed publicly |
| Postgres / Redis | Docker internal only | — |

Ports already in use (do not touch): 3000–3201, 4000–4001, 4101, 4201, 5432–5436, 8000–8006, 8069, 9000–9003.

---

## 1. Namecheap DNS

1. Log in to [Namecheap](https://www.namecheap.com) → **Domain List** → **swiftfleet.africa** → **Manage**
2. **Advanced DNS** tab
3. Remove any parking-page records you don’t need
4. Add:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| **A Record** | `@` | `62.171.186.126` | Automatic |
| **A Record** | `www` | `62.171.186.126` | Automatic |

5. Save. Propagation usually 5–30 minutes (up to 48h max).

**Verify:**

```bash
dig +short swiftfleet.africa A
dig +short www.swiftfleet.africa A
# Both should return 62.171.186.126
```

---

## 2. Nginx Proxy Manager — SSL proxy host

**Hosts** → **Proxy Hosts** → **Add Proxy Host**

### Details tab

| Field | Value |
|-------|--------|
| **Domain Names** | `swiftfleet.africa` |
| | `www.swiftfleet.africa` |
| **Scheme** | `http` |
| **Forward Hostname / IP** | `127.0.0.1` |
| **Forward Port** | `3300` |
| **Cache Assets** | off (optional) |
| **Block Common Exploits** | on |
| **Websockets Support** | on |

### SSL tab

| Field | Value |
|-------|--------|
| **SSL Certificate** | Request a new SSL Certificate with Let's Encrypt |
| **Force SSL** | on |
| **HTTP/2 Support** | on |
| **HSTS Enabled** | on (optional) |
| **Email** | your email for Let's Encrypt |
| **I Agree to the Let's Encrypt Terms of Service** | ✓ |

Save. NPM will issue the certificate once DNS points to this server and port 80/443 are reachable.

### Custom locations (not needed)

The Next.js app proxies `/api/*` to the backend inside Docker. You only need **one** proxy host to port **3300**.

---

## 3. First-time server setup

```bash
chmod +x deploy/setup-server.sh deploy/deploy.sh
./deploy/setup-server.sh          # creates /opt/swiftfleet/.env with secrets
./deploy/deploy.sh --seed           # build locally, upload images, migrate + seed
```

## 4. Migrate demo data to production

Loads the full RNT/G4S dataset (schedules, vehicles, invoices, rates, work tickets, etc.) into the tenant schema. Safe to re-run — skips tables that already have rows.

```bash
chmod +x deploy/migrate-data.sh
./deploy/migrate-data.sh            # deploy backend + seed demo data
./deploy/migrate-data.sh --force    # truncate and reload (destructive)
```

## 5. Subsequent deploys

```bash
./deploy/deploy.sh                  # uses git short SHA as version tag
./deploy/deploy.sh v1.2.0           # explicit version
```

## 6. CI/CD (GitHub Actions)

See `deploy/github-actions-deploy.yml` — copy to `.github/workflows/deploy.yml` and set secrets:

- `SWIFTFLEET_SSH_KEY` — private key for `root@62.171.186.126`
- `SWIFTFLEET_SERVER` — `root@62.171.186.126`

Server `.env` must already exist on the host.

---

## 7. Production URLs

| URL | Purpose |
|-----|---------|
| https://swiftfleet.africa | App |
| https://swiftfleet.africa/admin | Fleet operator (RNT) |
| https://swiftfleet.africa/client | Partner portal (G4S) |
| https://swiftfleet.africa/api/health | Frontend health |
| http://127.0.0.1:4300/api/v1/health | Backend health (SSH only) |

**Default login** (after seed): `admin` / `admin123`, tenant `g4s-kenya` — change passwords after first login.

---

## 8. Troubleshooting

```bash
ssh root@62.171.186.126
cd /opt/swiftfleet
docker compose ps
docker compose logs -f frontend
docker compose logs -f backend
curl http://127.0.0.1:3300/api/health
curl http://127.0.0.1:4300/api/v1/health
```

**NPM SSL fails:** DNS not propagated, or port 80 blocked. Ensure A records resolve to `62.171.186.126`.

**502 Bad Gateway:** Stack not running or wrong forward port (must be `3300`).
