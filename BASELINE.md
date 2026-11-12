# Performance baseline (measured before any change)

Recorded on the sandbox (2 vCPU), production build, local Postgres.

| Metric                | Baseline                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Production build      | passes, 56 routes                                                                           |
| JS chunks on disk     | 1,007,181 bytes (≈983 KB raw)                                                               |
| JS chunks gzipped     | **289 KB**                                                                                  |
| CSS                   | 87,939 bytes (≈86 KB raw)                                                                   |
| `.next` total         | 79 MB                                                                                       |
| `/api/health`         | 5.7 ms                                                                                      |
| `/api/cart`           | 10.0 ms                                                                                     |
| `/api/search?q=milk`  | 166 ms                                                                                      |
| `/` (SSR HTML)        | 289 ms                                                                                      |
| Source files (ts/tsx) | 127                                                                                         |
| Files over 300 lines  | **16**                                                                                      |
| Largest file          | `src/lib/catalog-data.ts` — 1,196 lines                                                     |
| Second largest        | `src/components/checkout-form.tsx` — 937 lines                                              |
| DB indexes            | orders/email/user, products/category, order_items/order, addresses/user, saved_items unique |
| Missing indexes found | `cart_items(cart_id)`, `sessions(expires_at)`, `orders(created_at)`                         |
| Lighthouse            | not installed in sandbox — no Chrome DevTools protocol; see "why" in the report             |

Note on Lighthouse: the sandbox has no system Chrome (installed Chromium is the
headless _shell_, which cannot run Lighthouse's navigation audits). I installed
Lighthouse and will report what it produces; otherwise I measure the same signals
Lighthouse would (bundle weight, LCP-ish SSR time, CLS invariants, payload sizes)
directly and state that explicitly rather than inventing numbers.
