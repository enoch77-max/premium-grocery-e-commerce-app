# Recurring grocery orders (backend phase)

## Payment gateway reality check — read this first

**This repository has no payment gateway integration.** Checkout only stores a
`payment_method` _label_ (`card` / `apple` / `cash`); no card is tokenised, no
charge is made, and no Stripe key exists in `.env.example`.

Recurring orders need **tokenised off-session charges**, which the current code
cannot do. Rather than fake it:

| Situation                                                     | Behaviour                                                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY` set **and** a saved `cus_…`/`pm_…` method | `StripeProvider` charges a real PaymentIntent with `off_session=true, confirm=true`, `allow_redirects=never`, and an `Idempotency-Key` per run                               |
| No key (the state of this repo)                               | `UnavailableProvider` **refuses** to charge: `gateway_unavailable`. The run is `held`, the list is paused with reason, the customer is notified. No order, no money claimed. |
| Test suite only (`RECURRING_TEST_HOOKS=1`)                    | Deterministic in-memory provider drives success/decline/expired/3DS/network cases                                                                                            |

So the feature is complete and safe; it simply **cannot take money until a gateway
is configured**. That limitation is printed by `GET /api/recurring/payment-methods`
(`gateway.supportsOffSessionTokenCharges: false`), not hidden.

## Order of operations

```
scheduled ──reserve stock──▶ reserved ──charge──▶ charged ──confirm──▶ confirmed
                                │                    │
                                └── failure ─────────┴──▶ held (stock released)
                                                             │
                                    retry ×3 / 48h ──────────┘──▶ failed + list auto-paused
```

- Stock is reserved **before** any charge; a failed charge always releases it.
- A run can never reach `confirmed` without a successful charge.
- `hold` / `skip_item` / `partial` policies decide what happens to shortages.
- Every transition is written to `recurring_run_events` (from → to → reason → actor).

## Concurrency and idempotency

- **Stock**: `UPDATE products SET stock = stock - $q WHERE id = $id AND stock >= $q`.
  Postgres serialises row updates, so exactly one of two racing buyers matches a
  row; the loser gets a clean out-of-stock result. No oversell, no negative stock.
- **Scheduler**: `SELECT … FOR UPDATE SKIP LOCKED` to pick due lists, then
  `INSERT INTO recurring_runs … ON CONFLICT (list_id, occurrence_key) DO NOTHING`.
  Running twice, or on ten servers, still produces one run per occurrence.
- **Charges**: each run has a stable `idempotency_key` (`rec:<listId>:<occurrence>`)
  reused for every retry, so a retried charge cannot bill twice.
- **Orders**: `orders.checkout_id` is unique; recurring runs insert
  `recurring:<runId>`, so a duplicated confirm returns the existing order.

## Priority allocation for scarce stock

`computePriority()` = earliest scheduled time (dominant) → more completed runs →
fewer skips → oldest subscription. Stored on the run as `priority_score` with the
formula written into `decision_reason` so admins can see why a run won. Admins can
override via `POST /api/recurring/admin/override` with a mandatory reason; the
override is logged to `recurring_run_events` **and** `audit_logs`.

## API surface

| Method   | Path                             | Purpose                                                   |
| -------- | -------------------------------- | --------------------------------------------------------- |
| GET/POST | `/api/recurring/payment-methods` | List / save a tokenised method (PANs rejected)            |
| GET/POST | `/api/recurring/lists`           | List my lists / create one (consent required)             |
| GET      | `/api/recurring/lists/:id`       | List + items + runs + audit trail                         |
| PATCH    | `/api/recurring/lists/:id`       | `pause` / `resume` / `cancel`                             |
| POST     | `/api/recurring/lists/:id/skip`  | Skip exactly one occurrence                               |
| POST     | `/api/recurring/lists/:id/delay` | Move the next run to a chosen ISO date                    |
| GET/POST | `/api/recurring/cron`            | Scheduler tick (`?mode=precheck` for the lead-time check) |
| GET/POST | `/api/recurring/test`            | Test hooks, 404 unless `RECURRING_TEST_HOOKS=1`           |
| GET/POST | `/api/recurring/admin/override`  | Admin: priority / pause / resume with reason              |

Cron protection: `Authorization: Bearer $CRON_SECRET`, or an admin session.

## Tests

```bash
npm run build
RECURRING_TEST_HOOKS=1 CRON_SECRET=dev npx next start -p 3100 &
npm run test:recurring      # 12 tests, serial (shared DB + provider)
```

Covers: two simultaneous buyers of the last item, the scheduler running twice,
payment failing after reservation (incl. retries → auto-pause), stock hitting zero
under all three shortage policies, pause/resume/skip/delay, consent enforcement and
PAN rejection.

---

# Customer UI (mobile-first)

Screens live under `/account/recurring` and reuse the account shell, tokens and
component vocabulary (`BottomSheet`, `Notice`, `shimmer`, `press`, brand/cream/clay
palette, Fraunces headings + Jakarta body).

| Route                    | Screen                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| `/account/recurring`     | List overview + upcoming-deliveries timeline                        |
| `/account/recurring/new` | Create: items, cadence, time, shortage preference, card, consent    |
| `/account/recurring/:id` | Manage: edit items/schedule, pause, resume, cancel, per-run actions |

## Files

```
src/features/recurring/ui/
  copy.ts              # all customer-facing voice; maps failure codes → kind sentences
  primitives.tsx       # skeleton, empty state, Notice, cadence/time/shortage pickers
  catalog-picker.tsx   # debounced search + quantity steppers (no modals per item)
  payment-setup.tsx    # Stripe hosted fields when a key exists; honest notice otherwise
  list-card.tsx        # per-list card + timeline row (skip/delay/pause on the card)
  delay-sheet.tsx      # bottom sheet: later today / next week / Saturday / any date
  list-form.tsx        # create+edit form
src/features/recurring/hooks/use-recurring.ts   # one data hook, one round-trip
```

Backend additions needed by the UI (built on the existing services, no duplication):
`GET /api/recurring/lists` now returns lists **+** items **+** runs in one payload;
`PATCH /api/recurring/lists/:id` accepts `action: "update"`; new
`POST /api/recurring/lists/:id/runs/:runId/resolve` for shortage choices; new
`POST /api/recurring/payment-methods/setup-intent`.

## Design decisions for fewer taps

- Skip / Delay / Pause are **on the list card** — the two most common jobs are one tap.
- Timeline rows for `held` runs show the three choices inline (send the rest / wait /
  skip) — no navigation required.
- Quantity steppers operate in place; no per-item modal.
- Cadence is three large tiles; time has four chips plus a native picker.
- One checkbox records consent and unlocks save.

## Voice

Every failure string comes from `copy.ts`. Gateway and scheduler codes
(`declined`, `expired_card`, `out_of_stock`, `gateway_unavailable`…) are mapped to
sentences such as _"Oops, we're all out of that right now. So sorry! Want us to send
the rest?"_ — technical text is never rendered. When no gateway is configured the UI
states plainly that nothing will be charged.

## Accessibility

Radio semantics (`role="radio"` + `aria-checked`) for pickers, `aria-label` on every
icon control, `aria-pressed` on chips, `role="status"` for notices, visible focus via
the global `:focus-visible` ring, 40–48px targets, `aria-live` on quantity changes,
and sheet content reachable by keyboard.

---

# Admin console + customer messaging

## Roles

`admin`, `manager`, `stock_manager`, `seller` (plus legacy `staff` ≡ `manager`) live in
`src/lib/permissions.ts` — a pure module so client pages can check them without
pulling in server code.

| Permission           | admin | manager | stock_manager | seller |
| -------------------- | ----- | ------- | ------------- | ------ |
| `recurring.demand`   | ✅    | ✅      | ✅            | ✅     |
| `recurring.settings` | ✅    | ✅      | —             | —      |
| `recurring.allocate` | ✅    | ✅      | ✅            | —      |
| `audit.view`         | ✅    | ✅      | ✅            | —      |

## Admin pages (under `/admin`, reusing the existing shell)

| Route                         | Screen                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| `/admin/recurring`            | Demand vs stock for the next 3/7/14 days, worst shortfall first   |
| `/admin/recurring/settings`   | Lead time 1–3 days + alert recipients per role                    |
| `/admin/recurring/allocation` | Automatic ranking with recorded reasons + audited override        |
| `/admin/recurring/audit`      | Searchable trail of orders/reservations/charges/retries/overrides |

Demand is computed from **list schedules** (nextRunAt + cadence expanded into the
window), not from runs — runs only exist once the scheduler claims them.

## Messaging

- Outbox: `notification_events` rows flow through `features/notifications/dispatch.ts`.
- Channels: WhatsApp (Meta Cloud API, pre-approved template codes + ordered body
  parameters) first when the customer opted in; **email (Resend) fallback on any
  WhatsApp failure**; email alone when that's their preference.
- Without `WHATSAPP_ACCESS_TOKEN` / `RESEND_API_KEY` the dispatcher marks the row
  `failed / no_transport` — it never pretends a message went out. The cron tick
  (`?mode=dispatch`) drains the queue once a transport exists.
- Templates: `features/notifications/templates.ts`, locale-keyed registry (`en`
  complete — the site ships English only). Every rendered body is asserted under
  300 characters in `tests/notifications.test.mjs`.
- Events covered: 24h reminder, order confirmed, item out of stock, partial order,
  order held, payment failed, list auto-paused, pause/skip/delay confirmed.
- Customer preference UI: `/account/settings` → "How should we message you?"
  (email / WhatsApp + number / driver SMS), saved instantly via `/api/account`.
- Shortage alerts to staff roles use the admin setting's lead window and recipient
  roles (`emitRoleShortageAlerts`), triggered by the cron precheck.

## Tests added

`tests/notifications.test.mjs` (template limits, honest no-transport failure, reminder
dedupe) and `tests/recurring-admin.test.mjs` (role matrix, lead-time validation,
demand shortfall math). Suite total: **31 passing**.
