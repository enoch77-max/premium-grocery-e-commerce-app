# Operations runbook

## Daily
- `/api/health` 200 + `/api/ready` 200 (uptime monitor, 60 s interval)
- `docker compose -f deploy/docker-compose.yml logs --since=24h app | grep -i error`

## Weekly
- Review `/admin` low-stock list and restock
- Check backup volume has 7+ dated files: `docker compose exec backup ls -lh /var/backups/fresco`
- Rotate staff access; confirm leavers are demoted (`users.role`)

## Incident: site down
1. `docker compose -f deploy/docker-compose.yml ps` — is `app` healthy?
2. `docker compose logs --tail=200 app` — schema error? DB down?
3. `curl -s localhost:5432` should refuse (DB is private by design).
4. Restart: `docker compose restart app`; DB: `docker compose restart postgres`.
5. TLS issue: `docker compose logs caddy` (certificate renewal is automatic).

## Incident: bad deploy
```bash
git checkout <previous-tag>
./deploy/deploy.sh
# if the schema changed:
./deploy/restore.sh /var/backups/fresco/<pre-deploy>.sql.gz.gpg
```

## Incident: suspected account compromise
1. Pause the store: `/admin/settings → Open/Paused`.
2. Sign out everyone: `DELETE FROM sessions;`
3. Rotate the owner password: `ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-admin.mjs`
4. Review `/admin` activity log and `audit_logs` for unfamiliar actions.
5. Rotate `POSTGRES_PASSWORD` and `BACKUP_PASSPHRASE`, redeploy.

## Store owner daily loop
| Task | Where |
| --- | --- |
| See revenue / open orders | `/admin` |
| Move an order to packed → out → delivered | `/admin/orders` |
| Change a price or stock | `/admin/products` |
| Hide a sold-out item | `/admin/products` (Live toggle) |
| Pause the shop | `/admin/settings` |
| Change announcement bar | `/admin/settings` |
| See top customers | `/admin/customers` |
