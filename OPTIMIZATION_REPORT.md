# Optimization report — before / after

Stack kept: **Next.js 16 (App Router) + React 19 + PostgreSQL (Drizzle)**. No migration.

## 1. Baseline (measured first, `BASELINE.md`)

| Metric                   | Before                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| Files (ts/tsx)           | 127                                                                                           |
| Files over 300 lines     | **16**                                                                                        |
| Largest file             | `catalog-data.ts` **1,196**                                                                   |
| 2nd / 3rd                | `checkout-form.tsx` 937, `header-client.tsx` 511                                              |
| JS on disk               | 1,007 KB (289 KB gzip total)                                                                  |
| Initial JS per route     | ~214 KB gzip                                                                                  |
| CSS                      | 86 KB raw                                                                                     |
| `/api/search?q=milk`     | 166 ms                                                                                        |
| `/` (SSR)                | 289 ms                                                                                        |
| `/api/cart`              | 10 ms                                                                                         |
| Lint                     | 1 error                                                                                       |
| Formatter                | **none configured**                                                                           |
| Tests for critical flows | **none**                                                                                      |
| DB indexes               | no `cart_items(cart_id)`, `sessions(expires_at)`, `orders(created_at)`, `products(is_active)` |

## 2. After

| Metric                 | Before          | After                                  | Change                         |
| ---------------------- | --------------- | -------------------------------------- | ------------------------------ |
| Files (ts/tsx)         | 127             | **167**                                | +40 (feature modules)          |
| Files over 300 lines   | 16              | **11**                                 | −31%                           |
| Largest file           | 1,196           | **407** (`account/addresses/page.tsx`) | −66%                           |
| `catalog-data.ts`      | 1,196           | 15 (barrel)                            | split into 13 data files       |
| `checkout-form.tsx`    | 937             | 335                                    | split into 4 + hook            |
| `header-client.tsx`    | 511             | 241                                    | split into 4                   |
| `product-manager.tsx`  | 339             | 186                                    | split into 3                   |
| `cart-provider.tsx`    | 394             | 359                                    | storage extracted              |
| `search-box.tsx`       | 401             | 241                                    | results panel extracted        |
| `settings/page.tsx`    | 463             | 261                                    | 4 components extracted         |
| **`/api/search` warm** | 166 ms          | **11 ms**                              | **15×**                        |
| **`/` SSR warm**       | 289 ms          | **58 ms**                              | **5×**                         |
| `/api/cart`            | 10 ms           | 7 ms                                   | faster                         |
| ESLint errors          | 1               | **0**                                  | fixed                          |
| Prettier               | absent          | configured + applied to 114 files      | —                              |
| Critical-flow tests    | 0               | **13 passing**                         | auth, cart, checkout, admin    |
| Dead dependency        | `cors` (unused) | removed                                | —                              |
| DB indexes             | 4 missing       | added (schema + live)                  | prod `is_active` partial index |

## 3. What actually changed

**Structure**

- New `src/features/` layout: `catalog/data/*` (one file per aisle), `checkout/{components,hooks,types}.ts`,
  `header/components/*`, `account/{settings,addresses}/*`, `admin/components/*`, `cart/lib/*`.
- Backend split by responsibility: `cart-identity.ts` (tokens/cookies) ·
  `cart-pricing.ts` (pure price math) · `cart-server.ts` (orchestration) ·
  `search/config.ts` (synonyms/intents) · `search.ts` (engine).
- Shared code stays in `src/components`, `src/lib`; icons grouped by purpose in
  `src/components/icons/{navigation,commerce,signals,account}.tsx` + barrel.

**Code quality**

- Prettier 3 config (`.prettierrc.json`, printWidth 110) applied across the repo.
- ESLint: fixed the one real error (impure `Date.now()` during render in the admin page).
- Removed unused `cors` dependency; `express` retained only by the legacy, non-deployed `server/`.
- One error-handling pattern kept: `{ error }` + status codes; admin routes use `withAdmin`
  and `{ ok, data }`.

**Backend / DB**

- 5 indexes added: `cart_items(cart_id)`, `sessions(expires_at)`, `orders(created_at desc)`,
  `products(is_active)` (partial), `users(role)` — mirrored in Drizzle so deploys keep them.
- Settings read cached 10s with explicit invalidation (already present, now shared by pricing).
- Cart pricing extracted as pure functions → trivially cacheable/testable.

**Tests (written before refactoring)**

- `tests/*.test.mjs` with `node --test`, no new dependencies: 13 flows covering
  login/logout/session, admin authorisation, cart add/update/remove, coupon rejection,
  checkout validation **and idempotency**, admin status vocabulary.

## 4. Image pipeline (added after the first report)

`next/image` with the built-in optimizer (sharp is present), AVIF/WebP negotiation,
30-day immutable cache, and explicit `sizes` per surface. `<img>` → `<Image>`
everywhere a product appears: 12 conversions across cards, gallery, cart, search,
offers, bundles, savings, order summary, delivery tracker.

Measured on the same product photo (Pexels origin):

| Variant                | Bytes      |
| ---------------------- | ---------- |
| Origin JPEG 720px      | **85,652** |
| AVIF 200px (card size) | **16,112** |
| AVIF 96px (thumbnail)  | **5,513**  |
| WebP 200px             | 12,502     |

Card images are now ~5× smaller at display size, and the product hero is declared
`priority` so it is the single preloaded LCP image.

## 5. Initial JS — correction and the real number

My first report said 207–215 KB and claimed the <200 KB target was unreachable. **That
measurement was wrong.** It summed every chunk in the HTML, including
`03~yq9q893hmn.js` (38.5 KB gzip) which carries `noModule` — the legacy core-js
fallback that **modern browsers never download**. Counting only executed scripts:

| Measurement                                                   | Value             |
| ------------------------------------------------------------- | ----------------- |
| Legacy `noModule` fallback (never fetched by modern browsers) | 38.5 KB gzip      |
| **Modern-browser initial JS — before this pass**              | **180.9 KB gzip** |
| **Modern-browser initial JS — after this pass**               | **176.5 KB gzip** |
| Target                                                        | < 200 KB ✅       |

Further cuts made after correcting the measurement:

- **Basket drawer is now lazy** (`components/lazy-cart-drawer.tsx`): the module is
  fetched the first time the basket is opened, not on page load. −1.6 KB.
- **Search overlay and aisle sheet are lazy** in the header: their chunks load on
  first open only. −2.8 KB.
- Verified in a real browser that all three still open: cart drawer ✓, search sheet
  opens with 6 live results ✓, aisle sheet lists 9 categories ✓, zero page errors.

Remaining floor: react-dom (69 KB) + Next client runtime (~75 KB) ≈ 145 KB of the
176.5 KB is framework. Our own initial payload is now ~31 KB gzip.

## 6. Targets — honest scorecard

| Target                       | Result                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse mobile ≥ 90       | **Not produced.** Sandbox has no system Chrome (headless _shell_ cannot run Lighthouse navigation audits). I did not invent a number. |
| LCP < 2.5 s                  | Not asserted. SSR HTML is 58 ms warm, no render-blocking third parties; LCP would be image-bound.                                     |
| INP < 200 ms                 | Plausible but unmeasured (no lab trace).                                                                                              |
| CLS < 0.1                    | Structurally controlled: fixed aspect-ratio media + reserved sticky bars.                                                             |
| **Initial JS < 200 KB gzip** | **MET: 176.5 KB** (was 180.9 KB before this pass). My earlier 214 KB figure wrongly included the legacy `noModule` chunk.             | Measured: ~85% is Next 16/React 19 framework (69 + 38 + 37 KB chunks); our own app chunks are 4–7 KB. Cutting below 200 KB requires dropping framework weight — out of scope for "don't migrate". |
| API p95 < 300 ms             | Met on warm paths (search 11 ms, cart 7 ms, health 5 ms). Cold start not measured per-percentile.                                     |
| No file > 300 lines          | **Not met: 10 remain** (was 16). Largest 1,196 → 407. Remaining list below.                                                           |

## 6. Remaining files over 300 lines (exact)

| File                                                 | Lines |
| ---------------------------------------------------- | ----- |
| `app/account/addresses/page.tsx`                     | 407   |
| `components/cart-drawer.tsx`                         | 398   |
| `components/cart-provider.tsx`                       | 359   |
| `app/page.tsx`                                       | 351   |
| `lib/search.ts`                                      | 350   |
| `components/product-buy-panel.tsx`                   | 341   |
| `components/checkout-form.tsx`                       | 335   |
| `features/account/orders/order-detail.tsx`           | 323   |
| `app/account/page.tsx`                               | 321   |
| `features/checkout/components/checkout-sections.tsx` | 305   |

## 7. Still to do (explicit, not hidden)

1. Remaining 11 files above 300 lines — mechanical continuation of the same pattern
   (addresses page form, order detail, login page, home page, buy panel, cart drawer).
2. Per-route `next/dynamic` for below-the-fold sections (`dynamic(..., {ssr:false})` must live
   in a Client Component — the root layout is a Server Component, so this needs a small
   client wrapper; attempted and reverted rather than shipping a broken build).
3. `<Image>`/AVIF+WebP pipeline for the 41 Pexels images (currently raw URLs with lazy loading).
4. Font subsetting is already self-hosted WOFF2; add `preload` for the display face.
5. Run Lighthouse in an environment with a real Chrome to fill the missing metrics.

## 8. Regression found and fixed after the image pass

Converting `<img>` to `next/image` with `fill` introduced **visual regressions**:
`fill` positions the image absolutely, so any parent without `position: relative`
let the image escape its box.

Symptoms reported: hero images bleeding over text, a giant coffee bag, empty
thumbnail squares in "Frequently bought together", and mismatched card photos.

Root causes and fixes:

1. **Missing `position: relative`** on 9 wrappers (bundle card ×2, cart row, search
   results, savings ladder, delivery tracker, order summary, frequently-bought ×2).
   Added `relative` (all fixed-size boxes, so layout is unchanged).
2. **Hero layering**: the decorative circular photo had no explicit z-index while
   copy sat at `z-[15]/z-[20]`; on some paint orders the photo covered headings.
   Photo is now `z-0`, copy `z-10`, and the image is `object-cover` inside its circle.
3. **Gallery thumbnails**: the 44px button was the positioning parent but the image
   also applied `scale()`, overflowing to 62px inside a 44px box. Thumbnails now
   have an inner `absolute inset-0 overflow-hidden` wrapper and drop the scale.

Verified with an automated audit (`img` rect vs parent rect) across `/`, `/offers`,
`/category/*`, `/product/*`, `/account`, `/checkout` → **0 overflowing images**,
0 console errors. 13 tests + 15 smoke checks still pass.

## 9. Edge-flush content (root cause found by measurement)

Reported symptom: cards and chips clipped flush against the left screen edge.

**Root cause: scroll-snap ignored the rail's gutter.** Measured directly:

```
.rail  scrollLeft=16  railLeft=0  firstCardLeft=0   <- first card flush at x=0
.snap-x scrollLeft=16  padLeft=16px                 <- browser auto-scrolled on load
```

`scroll-snap-align: start` aligns to the scrollport, not the padding box, so the
browser scrolled each rail by exactly its own 16px padding on load. Every snap rail
was therefore shifted 16px left, cutting the first card.

**Fix**: `scroll-padding-inline: 1rem` on `.rail` and on any `[class*="snap-x"]`
container, plus explicit `scroll-pl-4` on the product and service rails (reset to
`scroll-pl-0` at `sm` where the rails become grids). After the fix:

```
.rail   scrollLeft=0  firstCardLeft=16   ✅
.snap-x scrollLeft=0  firstCardLeft=16   ✅
```

**Also fixed in the same pass**

- Filter bar: the opaque sort `<select>` overlapped the chip rail, cutting "Vegan"
  and clipping its own "Most popular" label. Added a divider and left padding to
  the sort cluster, and gave the select an intrinsic width instead of a fixed 104px.
- Verified there is no other edge-flush content: automated scan of every rendered
  text leaf across 10 pages at 320px and 390px, excluding intentional fixed chrome
  (announcement bar, tab bar) and horizontal rails → **0 findings**.
- `scrollWidth == clientWidth` on 15 routes at 320px and 390px → no horizontal
  overflow anywhere.
