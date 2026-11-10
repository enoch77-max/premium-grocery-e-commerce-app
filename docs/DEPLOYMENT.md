# Deploying Fresco on one VPS

Target: a 2 vCPU / 4 GB Ubuntu 24.04 box. Everything runs on this host.

## 1. DNS + firewall

```bash
# A record: your-domain.example -> VPS IPv4   (AAAA if you have IPv6)
ufw default deny incoming && ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable
```
Only 80/443 are public. Postgres is never exposed.

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

## 3. Ship the code

```bash
git clone https://github.com/enoch77-max/premium-grocery-e-commerce-app /srv/fresco
cd /srv/fresco
cp .env.example .env && nano .env     # set DOMAIN, POSTGRES_PASSWORD, ADMIN_*, BACKUP_PASSPHRASE
```

Generate secrets:

```bash
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -base64 32   # ADMIN_PASSWORD
openssl rand -base64 48   # BACKUP_PASSPHRASE
```

## 4. Deploy

```bash
./deploy/deploy.sh
```

That script backs up, builds, starts, waits for `/api/health`, and applies the schema.
Caddy fetches the TLS certificate automatically on first request.

## 5. Create the owner account

```bash
docker compose -f deploy/docker-compose.yml exec app node scripts/seed-admin.mjs
```

Then sign in at `https://your-domain.example/admin/login`.

## 6. Verify

```bash
curl -fsS https://your-domain.example/api/health | jq
curl -fsS https://your-domain.example/api/ready  | jq
curl -sI https://your-domain.example | grep -Ei 'strict-transport|x-frame|content-security'
```

## Backups

Nightly at 03:00 UTC into the `backups` volume, AES-256 encrypted, 14-day retention.
Copy off the box (`deploy/backup.sh` supports `RCLONE_REMOTE`).

**Restore drill (do this before launch):**

```bash
docker compose -f deploy/docker-compose.yml run --rm -it \
  -e BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE" \
  -e DATABASE_URL="postgresql://fresco:$POSTGRES_PASSWORD@postgres:5432/fresco_restore_test" \
  backup sh /usr/local/bin/restore.sh /var/backups/fresco/<file>.sql.gz.gpg
```

## Upgrades and rollback

```bash
git pull && ./deploy/deploy.sh     # pre-deploy backup runs automatically
```
Rollback: `git checkout <previous-tag> && ./deploy/deploy.sh`, then restore the dump
taken by the failed deploy if the schema changed.

## Without Docker

```bash
npm ci && npm run build
sudo cp deploy/fresco.service /etc/systemd/system/ && sudo systemctl enable --now fresco
```
Point Nginx (`deploy/nginx.conf`) at `127.0.0.1:3000`.

## Operations checklist before taking money

- [ ] `.env` set, `SEED_DEMO_DATA=0` if you do not want the demo catalogue
- [ ] Owner password rotated, admin account created
- [ ] Backup restored once into a scratch database
- [ ] Uptime monitor on `/api/health` (60 s)
- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain (canonicals + sitemap)
- [ ] Log rotation: `docker compose logs --tail=100 app`
