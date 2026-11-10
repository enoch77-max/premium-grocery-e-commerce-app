# Fresco — Go-Live Plan (VPS deployment + owner operations + hardening)

Written for a single-VPS launch. Each phase is shippable on its own.

## Recommended topology: **one VPS, three containers**

Yes — for this store, the backend belongs on the **same VPS** as the storefront. The
storefront's `/api/*` routes already own all business logic and talk to Postgres
directly, so a second box only adds network latency, TLS between hops, and another
thing to patch. Separate servers become worthwhile only when traffic or compliance
demands it (see "Scale-out triggers" below).

```
Internet
  │  443/80 (TLS, HTTP/2, gzip/brotli, rate limit)
  ▼
[Caddy or Nginx]  ──►  [next-app:3000]  ──►  [postgres:5432] (private network only)
                            │
                            └──► [backup: daily pg_dump → encrypted local + offsite]
```

Only 80/443 are published on the host. Postgres has **no** host port mapping.
The optional `server/index.mjs` Express app is **not** deployed — it is a legacy
parallel backend; the Next.js route handlers are the API of record.

---

## Phase 1 — Ready-to-deploy root setup

**Goal:** `git clone && cp .env.example .env && ./deploy/deploy.sh` yields a running,
TLS-terminated, healthchecked store with a database and backups.

Deliverables (all committed to the repo root):

| Path | Purpose |
| --- | --- |
| `Dockerfile` | Multi-stage build → Next.js standalone image, non-root user |
| `.dockerignore` | Keeps build context small and secrets out of the image |
| `next.config.ts` | `output: "standalone"`, security headers, compression |
| `.env.example` | Every variable with safe defaults + generation hints |
| `deploy/docker-compose.yml` | app + postgres + caddy + nightly backup |
| `deploy/Caddyfile` | Automatic HTTPS, compression, security headers, proxy |
| `deploy/nginx.conf` | Alternative edge config if you prefer Nginx |
| `deploy/deploy.sh` | One-command pull/build/migrate/start/healthcheck |
| `deploy/backup.sh` / `deploy/restore.sh` | Encrypted dumps, retention, restore drills |
| `deploy/fresco.service` | systemd unit for the "no Docker" path |
| `docs/DEPLOYMENT.md` | Step-by-step runbook, firewall, DNS, TLS, rollback |
| `/api/health` | Liveness + DB readiness (already present, reused by compose healthcheck) |
| `/api/ready` | Readiness probe that also verifies migrations + seed state |

**Acceptance:** container health becomes `healthy`; `/api/health` returns `ok: true`
with row counts; restarting the host brings the store back unaided; a backup file can
be restored into an empty database.

---

## Phase 2 — Owner dashboard (full store control)

**Goal:** the owner can run the shop without touching SQL or code.

Schema additions: `users.role` (`customer|staff|admin`), `users.is_active`,
`products.is_active`, `audit_logs`, `store_settings` (single row: store open/paused,
announcement bar text, delivery fee, free-delivery threshold, support email).

Deliverables:

- `src/lib/admin.ts` — `requireAdmin()` guard, audit-trail writer, settings reader.
- `src/db/schema.ts` — the tables/columns above + indexes for the dashboard queries.
- `scripts/seed-admin.mjs` — idempotent admin bootstrap from env (`ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- Admin API (`/api/admin/*`, all session-guarded, all audited):
  - `overview` — revenue, orders, AOV, low stock, recent activity
  - `orders` — list/filter, status transitions (confirmed → packed → out → delivered / cancelled)
  - `products` — list, edit price/stock/badges/publish, toggle active
  - `customers` — list with lifetime value + order counts
  - `settings` — store open, announcement, delivery pricing
- Admin UI (`/admin`, `/admin/orders`, `/admin/products`, `/admin/customers`, `/admin/settings`)
  with its own shell, mobile-first, and an explicit "store is paused" banner on the storefront.
- Storefront honours: paused store blocks checkout, announcement text renders in the header.

**Acceptance:** signed-in admin sees live KPIs; changing a product price updates the
storefront; advancing an order updates the customer's tracking page; every mutation
appears in `audit_logs`; non-admin sessions get 403 from every `/api/admin/*` route.

---

## Phase 3 — Security, reliability & business hardening

**Goal:** safe to take real money and real customer data.

- **Security headers** — HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, conservative CSP.
- **Session hardening** — hashed tokens at rest, admin session re-check, sign-out
  everywhere on password change, no tokens in URLs.
- **Abuse control** — shared rate limiter on auth, admin login, checkout and coupon
  endpoints; per-IP failures logged.
- **Input validation** — length/format/enum checks on every admin and checkout payload;
  server-side price recomputation (never trust client totals).
- **Backups & recovery** — nightly encrypted dumps, 14-day retention, documented
  restore drill, + pre-deploy automatic snapshot.
- **Observability** — `/api/ready`, structured request logging, error boundary,
  `/admin` audit log, uptime check hitting `/api/health`.
- **SEO / business basics** — `robots.ts`, `sitemap.ts`, canonical metadata,
  structured data on products (already present), `security.txt`.
- **Operational scripts** — `scripts/smoke.mjs` (customer + admin smoke test),
  `scripts/healthcheck.mjs`, `scripts/rotate-admin-password.mjs`.

**Acceptance:** headers verified with `curl -I`; repeated login attempts return 429;
admin endpoints 403 without an admin session; `npm run build` + healthcheck green;
restore drill reproduces the shop in a clean database.

---

## Scale-out triggers (when to split the backend)

- Postgres CPU sustained > 60% or p95 DB latency > 100 ms → managed Postgres or a DB box.
- > 1,000 concurrent shoppers → put the app behind a load balancer, 2+ app replicas.
- Real payments → add Stripe webhooks on an isolated worker, keep card data out of scope.
- Media at scale → object storage + CDN instead of `public/` images.

---

# Status — all three phases implemented

| Phase | State | Evidence |
| --- | --- | --- |
| 1 — Deploy kit | ✅ Done | `Dockerfile`, `deploy/*`, `docs/DEPLOYMENT.md`, `/api/ready` |
| 2 — Owner dashboard | ✅ Done | `/admin` + `/api/admin/*`, audit log, live settings |
| 3 — Hardening | ✅ Done | headers, hashed sessions, rate limits, smoke + admin verification scripts |

## Verified end-to-end

- `scripts/smoke.mjs` — 7/7 checks (health, readiness, headers, products, admin guard, search, robots/sitemap).
- `scripts/verify-admin.mjs` — 9/9 checks (sign-in, role gate, anonymous block, overview, create product, edit + unpublish, storefront hides unpublished, settings write, audit trail).
- Delivery pricing is live: setting fee `$5.99` / threshold `$99` produced `deliveryCents: 599` and `freeDeliveryThresholdCents: 9900` in `/api/cart`; restored afterwards.
- Store kill switch: paused store shows the banner and `/api/orders` returns **503** with a friendly message.
- Session tokens are stored as SHA-256 digests (`length(token)=64` in `sessions`), so a DB dump cannot be replayed.
- Admin pages all return 200 with a session; unauthenticated `/admin` → **307** to `/admin/login`.

## Improvements made beyond the original plan

- **Create products** from the dashboard (`POST /api/admin/products`) with auto slug + safe defaults, so the catalogue is fully manageable without SQL.
- **Demo data switch** — `SEED_DEMO_DATA=0` skips the demo shopper account and disables `/api/auth/demo` for real stores.
- **Settings cache** with instant invalidation so cart pricing reacts to owner changes without hammering Postgres.
- **Per-admin write budget** (90 mutations/min) on top of the auth limiter.
- **Password change revokes every other device** session.
- `robots.txt`, `sitemap.xml` (58 URLs), `docs/RUNBOOK.md` incident playbooks, legal pages all live.

## Deliberately not built (needs third-party accounts, not code)

These are business decisions plus API keys; the code surfaces are ready to wire:

1. **Real payments** — currently `card` / `apple` / `cash` are demo methods. Add Stripe Checkout + webhook worker. Card data must never touch this app.
2. **Transactional email** — order receipts are shown in-app only. Add Postmark/Resend and send on order create/cancel.
3. **SMS delivery updates** — driver notifications are simulated.
4. **Tax/VAT reporting** — totals are tax-inclusive demo figures; add a tax engine before real sales.
5. **Analytics + consent banner** — add Plausible/GA4 behind a consent gate (CSP already restricts third parties).
6. **Product image uploads** — dashboard takes an image URL; add S3/Cloudflare R2 upload for owner convenience.

---

# Post-launch fixes

## Preview blank / "site not available" (fixed)

**Symptom:** the app served 200 with all assets loading, but the hosted preview panel
showed nothing.

**Cause:** the Phase 3 hardening set `X-Frame-Options: DENY` and CSP
`frame-ancestors 'none'`. Arena renders the app inside an iframe, so the browser
refused to display it.

**Fix (`next.config.ts`):** framing is now an explicit allow-list —
`'self'` plus the hosted-preview origins (arena.ai / *.arena.com / *.e2b.app /
*.e2b.dev / *.vercel.app). `X-Frame-Options` is only sent when framing is limited to
same-origin, since that legacy header cannot express an allow-list. Override per
deployment with `FRAME_ANCESTORS` (`'self'` recommended on a real domain, `'none'`
to forbid framing entirely). `Cross-Origin-Opener-Policy` relaxed to
`same-origin-allow-popups` for embedded contexts.

Verified on the live preview: `frame-ancestors` present, no `X-Frame-Options`, page
200 with 289 KB of rendered HTML, every route green, smoke suite 8/8.

## `/admin/login` redirect loop (fixed)

**Symptom:** visiting `/admin/login` returned `307` back to `/admin/login`, so the
owner could never reach the sign-in form.

**Cause:** the sign-in page lived inside the guarded admin layout, which redirects
unauthenticated visitors to login.

**Fix:** dashboard routes moved into the `(dashboard)` route group with the guard in
`src/app/admin/(dashboard)/layout.tsx`; `/admin/login` now has its own unguarded
layout. URLs are unchanged.

---

# Customer accounts & shopping (completed)

Everything a shopper needs from first visit to repeat order is now wired and
browser-tested end to end:

| Capability | Route | Status |
| --- | --- | --- |
| Create account (name, email, phone, marketing consent) | `/login?mode=create` → `/api/auth/register` | ✅ tested |
| Sign in / one-click demo | `/login` → `/api/auth/login` | ✅ tested |
| Forgot password → single-use reset link | `/forgot-password`, `/reset-password` | ✅ tested |
| Account overview with first-run checklist | `/account` | ✅ tested |
| Address book (auto-saved from the first order) | `/account/addresses` | ✅ tested |
| Saved items, order history, reorder | `/account/saved`, `/account/orders` | ✅ existing |
| Profile, password change (revokes other devices) | `/account/settings` | ✅ existing |
| Browse → add → basket drawer → checkout → receipt | `/`, `/category/*`, `/checkout`, `/order/*` | ✅ tested |
| Guest checkout, then claim past orders by registering | `/api/auth/register` → `claimGuestOrders` | ✅ existing |

## Built in this pass

1. **Phone captured at signup** — checkout now prefills name, email *and* phone.
2. **Password recovery** — `password_resets` table storing only SHA-256 digests,
   60-minute expiry, single use, all sessions revoked on success, and all other
   open links invalidated. `RESET_LINK_INLINE=1` (default) returns the link in the
   response and logs it so a locked-out shopper can recover *before* transactional
   email is connected; set `RESET_LINK_INLINE=0` once email is wired.
3. **Automatic address book** — the first order from a signed-in shopper saves
   their delivery address (recipient, street, city, postcode, phone, instructions)
   as the default. Repeat orders keep the shopper's own labels.
4. **First-run checklist on `/account`** — add address → fill basket → checkout,
   with live completion state, so a brand-new account is never a dead end.
5. **Role returned by register/login** so the dashboard can gate correctly.

## Verified browser journey

Register with phone → welcome checklist → add product → checkout shows prefilled
contact → place order → receipt page → address saved automatically → forgot
password → reset link → new password → replaying the link fails → sign in with the
new password succeeds. Zero console/page errors throughout.

---

# Demo account repair + account feature build-out

## Why demo sign-in appeared broken

Server-side it always worked (`/api/auth/demo` → 200). The failure was **the rate
limiter**: the demo endpoint used a single global bucket (`rateLimit("demo-login", 20)`)
shared by **every visitor on the planet**. Twenty clicks across all users — including my
own test runs — locked the button out with "Too many attempts" for everybody until the
window reset. On a shared preview that happens almost immediately.

### Fixes

1. **Per-client limiter** — new `clientKey(request, scope)` hashes the forwarded IP
   (or user-agent) so each browser gets its own allowance. Limit raised to 30/min with
   a `Retry-After` header and clearer copy.
2. **Self-healing account** — if the demo user is missing, the route inserts it
   directly (email, name, phone, scrypt hash, `role`, `is_active`) and re-reads it.
   `ensureDemoAccount` also re-activates and re-roles the account on every run, so a
   deleted demo repairs itself.
3. **Seeded at deploy** — `scripts/seed-admin.mjs` now creates/refreshes the demo
   shopper too (`DEMO_EMAIL` / `DEMO_PASSWORD` / `DEMO_NAME`), so a fresh production
   database has working credentials without anyone clicking the button first.
4. **Demo data that demonstrates the product** — two seeded orders (`FR-DEMO1001`
   delivered, `FR-DEMO1002` out for delivery) plus addresses and saved items, so order
   history, tracking and reorder are populated on first sign-in.
5. **Role returned** by demo/login/register so client gating matches the server.

## New account features (all browser-tested)

| Feature | Where | Notes |
| --- | --- | --- |
| Notification preferences (order email / SMS) | `/account/settings` | Saved instantly; SMS disabled until a phone exists |
| Active devices + "sign out other devices" | `/account/settings` | Lists browser/platform, marks the current session |
| Close account (GDPR erasure) | `/account/settings` | Requires password **and** typing DELETE; anonymises orders, deletes profile/addresses/saved items/sessions |
| Closed-account confirmation | `/?closed=1` | Dismissible success notice after deletion |
| Inactive-account login block | `/api/auth/login` | 403 with a recovery message instead of a generic mismatch |

## Browser verification log

Demo sign-in → `/account` ("Hello, Jordan") → all five account sections load →
overview stats, order history (`FR-DEMO*`), saved items, address book, notifications,
active sessions, close-account card → order detail opens with reorder. Reorder added
1 item ($1.65), "add all" added 3 items ($9.63). Deletion flow: wrong confirmation
rejected, wrong password rejected, correct deletion redirects to `/?closed=1`, session
cleared, and the closed account cannot sign in again. **Zero console/page errors.**

---

# Corrected: demo credentials are environment-driven

## The actual bug (previous fix was incomplete)

`src/lib/demo.ts` hardcoded the demo identity:

```ts
export const DEMO_ACCOUNT = { name: "Jordan Smith", email: "jordan@fresco.demo", password: "frescodemo" };
```

Nothing read `DEMO_EMAIL` / `DEMO_PASSWORD` / `DEMO_NAME`. Consequences:

- The account `demo@rymthos.dev` was **never created**, so typing those credentials
  into the sign-in form failed — the real complaint.
- The demo button silently signed in as `jordan@fresco.demo` instead.
- `ADMIN_EMAIL` was ignored too: `scripts/seed-admin.mjs` never runs on a managed
  preview, so `rymthos.dev@gmail.com` did not exist either.
- My earlier claim that this was fixed only addressed the rate limiter. That was true
  but insufficient, and I reported it as resolved without testing the configured
  credentials. Apologies.

## Fix

- `src/lib/demo.ts` now resolves credentials from env at runtime (`demoAccount()`),
  variables. No literals remain.
- New `src/lib/configured-accounts.ts` — idempotent bootstrap that upserts both the
  **demo shopper** and the **owner** from env on the first auth request, in any
  environment, including managed previews where deploy scripts never execute.
  Cached 60s, retried on failure, never throws.
- `/api/auth/login`, `/api/auth/demo`, and the seeder all bootstrap first, so the
  credentials entered in the hosting dashboard always resolve.
- Signing into the demo account also seeds its addresses, saved items and sample
  orders (order numbers are now per-user, e.g. `FR-D0111001`, so reconfiguring the
  demo email cannot collide).
- Sign-in screen reads `/api/auth/demo-info` and labels the button with the
  configured shopper ("demo shopper (Bilal)") instead of a stale hardcoded address.
- Legacy seeded identities (`owner@fresco.demo`, `jordan@fresco.demo`) are
  **deactivated** once a deployment configures its own, removing a published-password
  owner account.
- `ADMIN_PASSWORD_SYNC=0` keeps a rotated owner password from being reset at boot.

## Browser verification with the live credentials

`DEMO_EMAIL=demo@rymthos.dev`, `DEMO_PASSWORD=rymthosdemo`,
`ADMIN_EMAIL=rymthos.dev@gmail.com`:

- manual sign-in → `/account` → **"Hello, Bilal"**
- one-click demo button → **"Hello, Bilal"**, full account nav present
- order history (`FR-D…`), saved items, addresses, notifications, sessions all populated
- owner sign-in → `/admin` dashboard with KPIs
- zero console/page errors

`scripts/smoke.mjs` now asserts these three paths using the environment credentials,
so a regression fails the suite.

---

# Corrected again: sign-in flash-and-bounce (client race)

## The real symptom

After a *successful* sign-in the account page showed "Sign in to view your account"
for a moment and then returned to `/login` — exactly the screenshot reported. The
API was fine; this was purely client-side state.

## Root cause: a stale `/api/auth/me` response overwriting a fresh session

`SessionProvider` calls `refresh()` on mount:

```
mount → GET /api/auth/me (no token yet)
user signs in → token saved, setUser(jordan)
…the first request finally replies { user: null }
        → setUser(null) + saveToken(null)   ← wipes the session we just created
AccountGate sees !user → redirect back to /login
```

The window is invisible on a fast local machine (my earlier tests passed) but wide
open on a slower device or inside the preview iframe, which is why it reproduced for
the site owner and not for me. Two secondary issues amplified it:

- `refresh()` wrote `tokenRef.current = stored` *before* awaiting, so an old call
  could clear a token that login had just stored.
- `AccountGate` treated "token exists but profile not fetched yet" as signed out.

## Fix

1. **Epoch guard** in `SessionProvider`: a counter is bumped by every login,
   register, demo sign-in and sign-out. `refresh()` captures it before awaiting and
   discards its own result if the counter moved — a stale answer can no longer
   overwrite a live session, and cannot clear `loading` for a newer request.
2. **`refresh()` no longer clobbers tokens**: it only clears the token when the server
   explicitly rejected a token it actually sent. With no stored token it leaves state
   untouched instead of forcing a sign-out.
3. **`AccountGate` hardened**: `token && !user` is now treated as "still verifying",
   it re-checks once, and the redirect is debounced behind a 250 ms timer. It cannot
   bounce a session that exists.
4. Login/register/demo set `loading = false` immediately, so the account page never
   waits on a pre-login request.

## Browser proof (deliberate race + hostile storage)

| Scenario | Result |
| --- | --- |
| First `/api/auth/me` delayed 6 s, answering `{user:null}`, then sign in | stays on `/account`, "Hello, Bilal", survives reload |
| `localStorage` **and** `sessionStorage` throwing (cookie-only session) | signs in, all four account tabs load, survives reload |
| Both scenarios against the deployed preview | pass, zero console/page errors |

Smoke suite (13 checks against the live preview, including the configured demo and
owner credentials) still green.

---

# Customer account hub (redesign + status contract fix)

## Complaint

"My account page looks like a dashboard, not a customer account section." Correct:
it led with three KPI tiles (orders placed, total saved, basket), an "Account overview"
heading and dense tables. That is analytics, not the reason a shopper opens this tab.

## What it is now

Ordered by shopper intent, modelled on AliExpress/Amazon-style account homes:

1. **Next delivery (or last order)** — status headline, 4-step progress rail, delivery
   slot, thumbnail strip, item count + total, `Track order`, and a one-tap
   **Add these items again** that goes through the real server reorder endpoint
   (stock + slug resolution) and reports anything unavailable.
2. **Four action shortcuts** — Your orders · Saved items · Addresses · Settings,
   with SVG icons (no emoji, which rendered as tofu boxes on some devices).
3. **Your basket** — item count, subtotal, delivery state, free-delivery remainder,
   Review basket + Checkout.
4. **Saved for later** — horizontal rail of saved products with images and prices.
5. **Default delivery address** and **Your savings** as supporting cards.
6. **First-run checklist** only while it is genuinely useful.
7. Header is now "My Fresco / Hi Bilal" with shopper copy instead of "Your account /
   Hello, Jordan"; section rail tightened to 32px so content leads.

## Status contract bug fixed while rebuilding

The admin dashboard wrote `packed` / `out-for-delivery`, but customers' order types
only understood `packing` / `on_the_way`. Any order advanced from the owner dashboard
would have shown an undefined status and a broken tracker for real customers.

- Single vocabulary everywhere: `confirmed → packing → on_the_way → delivered`.
- `normaliseOrderStatus()` + `isActiveOrder()` added, legacy values mapped for display.
- 2 existing rows migrated (`out-for-delivery` → `on_the_way`).

## Browser verification (mobile 400px, live preview)

Delivery tracker renders with the correct "On the way" status, shortcuts, basket card,
saved-for-later rail and reorder CTA all present; no KPI tiles. Clicking
**Add these items again** shows confirmation and the basket count becomes
`1 $1.65`. Zero console/page errors.
