# Fresco — grocery storefront + backend

A production-shaped grocery store: Next.js storefront, PostgreSQL via Drizzle, and a
standalone Express backend in `server/`. One database, one schema.

## Layout

```
src/                  Next.js storefront and its /api routes
server/index.mjs      standalone Express + PostgreSQL backend (port 4000)
db/schema.sql         schema backup / restore reference
scripts/              demo-account seeder and browser journey test
```

## Run

```bash
npm run dev                       # storefront on :3000
node server/index.mjs             # optional standalone backend on :4000
```

## Database

`DATABASE_URL` in `.env` points at PostgreSQL. Restore the schema anywhere with:

```bash
createdb fresco && psql fresco < db/schema.sql
```

## Demo account

`/login` → "Sign in with the demo account (one click)", or
`jordan@fresco.demo` / `frescodemo`. The account is self-healing: it is recreated
with its addresses and saved items if the database is reset.

## Cart identity

A browser can hold two cart tokens (localStorage header + httpOnly cookie) which
can drift apart when storage is blocked or cleared. Every cart endpoint resolves
all candidate tokens, picks the basket that actually has items, and re-issues the
winning token to both places — so "empty basket" cannot appear while a basket
exists. Orders are idempotent via `checkoutId`, so double submits never duplicate.

---

## Production deployment (single VPS)

Everything needed to run this as a real shop is in the repo root:

```bash
git clone <repo> /srv/fresco && cd /srv/fresco
cp .env.example .env      # set DOMAIN, POSTGRES_PASSWORD, ADMIN_*, BACKUP_PASSPHRASE
./deploy/deploy.sh        # backup → build → start → migrate → healthcheck
node scripts/seed-admin.mjs
```

- `deploy/` — Docker Compose (app + Postgres + Caddy TLS + nightly encrypted backups),
  Nginx and systemd alternatives, backup/restore scripts.
- `docs/DEPLOYMENT.md` — step-by-step runbook, firewall, DNS, rollback.
- `docs/RUNBOOK.md` — incidents, compromise response, daily owner loop.
- `docs/GO-LIVE.md` — business readiness checklist (payments, email, tax, consent).
- `PHASES.md` — what was built in each phase and what is deliberately deferred.

### Owner dashboard

`/admin` (staff sign-in at `/admin/login`): revenue and order KPIs, fulfilment
transitions, catalogue create/edit/publish, stock, customers, store pause switch,
announcement bar and delivery pricing. Every change is written to `audit_logs`.

### Verification

```bash
BASE_URL=https://shop.example node scripts/smoke.mjs
BASE_URL=https://shop.example ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/verify-admin.mjs
BASE_URL=https://shop.example node scripts/healthcheck.mjs
```
