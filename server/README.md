# Legacy Express backend — NOT deployed

This folder is the original standalone Express API from the first iteration of the
project. The deployment that ships in this repository does **not** run it:

* The Next.js route handlers under `src/app/api/**` are the API of record. They own
  carts, checkout, orders, accounts, search and the owner dashboard.
* Running both would create two writers to the same tables and two sources of truth
  for pricing and stock.

Keep this folder only as historical reference. If you ever need to split the backend
onto its own host, port the handlers from `src/app/api/**` (they are already
framework-thin) and point the storefront at them with `BACKEND_API_URL`.

See `docs/DEPLOYMENT.md` for the single-VPS architecture that is actually supported.
