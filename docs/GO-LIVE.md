# Go-live checklist (business)

## Before the first real order

- [ ] Domain + HTTPS live (`./deploy/deploy.sh`, Caddy cert issued)
- [ ] `SEED_DEMO_DATA=0` in `.env`, redeploy, delete the demo account if it exists
- [ ] Owner account created, password ≥ 16 chars, stored in a password manager
- [ ] `ADMIN_EMAIL` belongs to the business, not a personal inbox
- [ ] Replace demo catalogue with real products (dashboard → Catalogue → + New)
- [ ] Set delivery fee + free-delivery threshold (Settings) and test a basket
- [ ] Replace legal pages (`/info/privacy`, `/info/terms`, `/info/accessibility`) with reviewed copy
- [ ] Support email + phone on `/info/contact` are monitored daily
- [ ] Backup restored once into a scratch DB (documented drill)
- [ ] Uptime monitor on `/api/health` with alerts to a phone
- [ ] `NEXT_PUBLIC_SITE_URL` matches the domain (canonicals + sitemap)

## Payment readiness (required before charging cards)

- [ ] Business bank account + processor approval (Stripe/Square)
- [ ] Stripe keys in `.env`, webhook endpoint, idempotent order finalisation
- [ ] Refund policy + how staff issue refunds (currently: cancel order in dashboard)
- [ ] PCI scope: never store card numbers in Postgres
- [ ] Email receipts enabled (see below)

## Email / SMS readiness

- [ ] Transactional provider account (Postmark, Resend, SES)
- [ ] Verified sending domain (SPF, DKIM, DMARC)
- [ ] Templates: order confirmation, out-for-delivery, delivered, cancellation
- [ ] Optional SMS provider for delivery ETA

## Operations rhythm

| Cadence | Task |
| --- | --- |
| Daily | Check `/admin` open orders; advance fulfilment; answer contact email |
| Daily | Confirm overnight backup file exists |
| Weekly | Restock low-stock items; review audit log; rotate staff access |
| Monthly | Restore drill; dependency updates (`npm audit`, `npm outdated`); review CSP/logs |

## Growth levers already wired

- Coupons (`FRESH10`, bundles) and multi-buy savings apply automatically in the basket.
- Search understands budgets and diets ("dinner under $15") — good for merchandising.
- Bundle builder + upsells in the cart drawer increase AOV.
- Customer list with lifetime value + marketing consent is exportable from `/admin/customers`.
