# Fresco backend (root-level standalone server)

A complete REST backend for the store, runnable **without Next.js**. It shares the
same PostgreSQL database and schema as the storefront, so either client sees the
same carts, orders and accounts.

## Run

```bash
node server/index.mjs              # http://localhost:4000
PORT=4100 node server/index.mjs    # custom port
DATABASE_URL=postgres://... node server/index.mjs
```

`express` and `cors` are already installed as project dependencies, so no extra
install step is needed.

## Database

- **Live database**: the sandbox PostgreSQL instance (`DATABASE_URL` in `.env`).
- **Schema backup / restore reference**: [`../db/schema.sql`](../db/schema.sql)

```bash
createdb fresco
psql fresco < db/schema.sql          # full schema, indexes and constraints
node scripts/seed-account.mjs        # demo account + addresses + saved items
# catalogue rows seed themselves the first time the storefront renders
```

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | DB connectivity + row counts |
| GET | `/api/categories` | all aisles |
| GET | `/api/products?category=&q=` | catalogue |
| GET | `/api/products/:slug` | single product |
| GET | `/api/cart` | resolves every candidate token, returns the best basket |
| POST | `/api/cart` | `{ productId, quantity }` or `{ items: [...] }` |
| PATCH | `/api/cart` | `{ productId, quantity }` |
| DELETE | `/api/cart?productId=` | remove a line |
| POST | `/api/cart/coupon` | `{ code }` (saved even below minimum spend) |
| DELETE | `/api/cart/coupon` | clear the code |
| POST | `/api/orders` | idempotent via `checkoutId` |
| POST | `/api/orders/track` | `{ orderNumber, email }` |
| POST | `/api/auth/demo` | self-healing demo session |
| POST | `/api/auth/login` | email + password |
| GET | `/api/account/orders` | requires `x-session-token` |

## Cart identity (the root cause of "empty basket")

Browsers can hold **two** cart tokens: the `x-cart-token` header (localStorage)
and the httpOnly `fresco_cart` cookie. Inside embedded previews, or when storage
is blocked, cleared or partitioned, those drift apart. Previously the header won
unconditionally, so a request could read a basket that was empty while the live
basket sat under the other token — the storefront showed items, the order API
said "Your basket is empty", and the flow bounced back.

Both this server and the Next.js API now resolve **all** candidate tokens, pick
the basket that actually has items (ties break on most recently updated), and
re-issue the winning token to both storage locations. A basket that exists in
either place is always found, so the order flow cannot dead-end.

Orders are additionally idempotent (`checkoutId`), so a double-click, refresh or
retry returns the original order instead of a duplicate or an error.
