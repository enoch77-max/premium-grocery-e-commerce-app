# Architecture

## Stack

Next.js 16 (App Router) + React 19 + PostgreSQL via Drizzle ORM. No migration planned.

## Folder structure

```
src/
  app/                    Routes only — thin pages that fetch data and render.
                          No business logic in route files. Client pages end in /page.tsx.
  app/api/                Route handlers (thin) -> src/lib/* services -> Drizzle.
  components/             Shared UI primitives (buttons, cards, shells, icons).
  components/icons/       Icons grouped by purpose: navigation, commerce, signals, account.
  features/<feature>/     Feature code: components/, hooks/, services/, types.
                          Current features: catalog, checkout.
  lib/                    Cross-cutting services: auth, sessions, search engine,
                          delivery, formatting, admin guards, seed.
  db/                     Drizzle schema (schema.ts) + connection (index.ts).
tests/                    node:test HTTP suites: auth, cart, checkout, admin.
scripts/                  Operational: smoke, verify-admin, healthcheck, seeders.
deploy/                   Docker Compose, Caddy/Nginx, backup/restore, runbook.
```

## The 300-line rule

No source file over 300 lines. No component or function over ~50 lines.
One responsibility per file. When a file approaches 250 lines, split it before the
next feature lands — not after.

## Naming rules

- Components: `PascalCase.tsx` matching the export (`ProductCard` -> product-card.tsx).
- Hooks: `use-*.ts` in the feature's `hooks/` folder.
- API routes: HTTP verbs only (`GET`/`POST`/`PATCH`/`DELETE`); business logic lives
  in `src/lib/*`, never inline in the route.
- Response shape: `{ ok: true, data }` for admin, `{ error }` with proper status otherwise.
- Dates cross the client boundary as ISO strings, never `Date` objects.

## Verified by

`node --test tests/*.test.mjs` against a running server (13 flows: auth, cart,
checkout idempotency, admin guard + vocabulary). `npm run build` must stay green.
