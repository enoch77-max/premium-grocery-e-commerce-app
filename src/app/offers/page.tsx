import Link from "next/link";
import type { Metadata } from "next";
import { getBundles, getCategories, getCoupons, getOffers, getProducts } from "@/lib/store";
import { deliverySlots, discountPercent, formatMoney } from "@/lib/format";
import { MiniOfferCard } from "@/components/offer-carousel";
import { BundleCard } from "@/components/bundle-card";
import { CouponCard } from "@/components/coupon-card";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  TruckIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offers, coupons & bundles — Fresco",
  description: "Every live grocery offer, coupon code and money-saving bundle in one place.",
};

export default async function OffersPage() {
  const [offers, coupons, bundles, products, categories] = await Promise.all([
    getOffers(),
    getCoupons(),
    getBundles(),
    getProducts(),
    getCategories(),
  ]);

  const flashDeals = [...products]
    .filter((product) => product.compareAtCents && product.compareAtCents > product.priceCents)
    .sort((a, b) => discountPercent(b.priceCents, b.compareAtCents) - discountPercent(a.priceCents, a.compareAtCents))
    .slice(0, 8);

  const totalSaving = flashDeals.reduce(
    (sum, product) => sum + ((product.compareAtCents ?? product.priceCents) - product.priceCents),
    0,
  );

  return (
    <div className="mx-auto max-w-[1340px] px-4 pt-4 sm:px-6 sm:pt-5">
      <section className="overflow-hidden rounded-[26px] border border-line/70 bg-[#13261d] text-cream">
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.4fr_1fr]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/40 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-deep">
              <BoltIcon className="h-3 w-3" /> Live today
            </span>
            <h1 className="mt-3 font-display text-[30px] font-semibold leading-[1.03] tracking-[-0.03em] sm:text-[40px]">
              Offers that actually
              <br /> change your total.
            </h1>
            <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-cream/70">
              {offers.length} live banners, {coupons.length} stackable coupons and {bundles.length} curated baskets.
              Every saving is applied in the basket before you pay — no codes to hunt down at checkout.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="#coupons"
                className="press inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2.5 text-[12px] font-bold text-brand-deep hover:bg-white"
              >
                Copy a coupon <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="#bundles"
                className="press inline-flex items-center gap-1.5 rounded-full border border-white/25 px-4 py-2.5 text-[12px] font-bold text-cream hover:bg-white/10"
              >
                Shop bundles
              </Link>
            </div>
          </div>
          <div className="relative grid grid-cols-2 gap-2 self-center">
            {[
              { label: "Live offers", value: String(offers.length), note: "verified this morning" },
              { label: "Total deal value", value: formatMoney(totalSaving, false), note: "across flash deals" },
              { label: "Free delivery", value: "$35+", note: "no membership" },
              { label: "Delivery window", value: "30 min", note: "7 days a week" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/12 bg-white/[0.06] p-3 backdrop-blur">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-cream/55">{stat.label}</p>
                <p className="mt-0.5 font-display text-[22px] font-semibold leading-none">{stat.value}</p>
                <p className="mt-1 text-[10px] text-cream/50">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionHeading
          eyebrow="Clickable offer banners"
          title="This week's headline deals"
          subtitle="Tap any banner to jump straight into the aisle it belongs to."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <div key={offer.slug} className="flex min-h-[142px]">
              <MiniOfferCard offer={offer} />
            </div>
          ))}
          <div className="flex min-h-[142px] flex-col justify-between rounded-[22px] border border-line/80 bg-white p-4">
            <div>
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand">Stack the savings</p>
              <p className="mt-1 font-display text-[19px] font-semibold leading-tight">Free delivery + a coupon?</p>
              <p className="mt-1 text-[11px] leading-snug text-ink-soft">
                Yes. Delivery is waived at $35, and fixed or percentage coupons subtract after that.
              </p>
            </div>
            <Link href="#coupons" className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline">
              See how it stacks <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      <section id="coupons" className="mt-9 scroll-mt-32">
        <SectionHeading
          eyebrow="Coupon wallet"
          title="Copy a code, save at checkout"
          subtitle="One code per basket. Coupons stack on top of multi-buy savings — never on another code."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <CouponCard key={coupon.code} coupon={coupon} />
          ))}
        </div>
        <p className="mt-2 text-[10.5px] text-ink-soft">
          Codes are case-insensitive and can be applied in the basket or at checkout. Try{" "}
          <span className="font-bold text-ink">FREE DEL</span>? It&apos;s actually{" "}
          <span className="font-bold text-ink">FREEDEL</span>.
        </p>
      </section>

      <section id="bundles" className="mt-9 scroll-mt-32">
        <SectionHeading
          eyebrow="Bundle & save"
          title="Baskets built by our buyers"
          subtitle="Priced below the sum of their parts. Everything lands in your basket with one tap."
          href="/category/fresh-produce"
          actionLabel="Shop the aisles"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {bundles.map((bundle) => (
            <BundleCard key={bundle.slug} bundle={bundle} />
          ))}
        </div>
      </section>

      <section className="mt-9">
        <SectionHeading
          eyebrow="Flash deals"
          title="The biggest markdowns right now"
          subtitle={`${flashDeals.length} items with verified price drops — savings shown against our own usual price.`}
          href="/category/fresh-produce"
          actionLabel="Shop fresh"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {flashDeals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section id="delivery" className="mt-9 scroll-mt-32 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-3xl border border-line/80 bg-white p-5 sm:p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand">Delivery & fees</p>
          <h2 className="mt-1.5 font-display text-[25px] font-semibold leading-tight tracking-tight sm:text-[30px]">
            Pick the slot that fits your day.
          </h2>
          <p className="mt-1.5 max-w-lg text-[12.5px] leading-relaxed text-ink-soft">
            Free delivery on every basket over $35. Under that, it&apos;s a flat $3.99 — or free with code FREEDEL on
            $25+. No surge pricing, no small-order fee, no membership.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {deliverySlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 rounded-2xl border border-line/80 bg-cream/50 px-3 py-2.5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-brand shadow-sm">
                  {slot.icon === "bolt" ? (
                    <BoltIcon className="h-4 w-4 text-amber" />
                  ) : slot.icon === "moon" ? (
                    <MoonIcon className="h-4 w-4" />
                  ) : (
                    <SunIcon className="h-4 w-4 text-amber" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-ink">
                    {slot.label} · {slot.detail}
                  </p>
                  <p className="text-[10.5px] text-ink-soft">{slot.feeNote}</p>
                </div>
                <CheckIcon className="h-4 w-4 text-brand" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/category/fresh-produce"
              className="press inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-bold text-white hover:bg-brand-deep"
            >
              Start shopping <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/search?q=breakfast+under+%2410"
              className="press inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-[12px] font-bold text-ink hover:border-brand hover:text-brand"
            >
              Breakfast under $10
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-line/80 bg-cream-deep/60 p-4">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
              <TruckIcon className="h-4 w-4 text-brand" /> Free delivery meter
            </p>
            <p className="mt-1 font-display text-[22px] font-semibold leading-tight">$0 → $35</p>
            <p className="text-[11px] text-ink-soft">
              A basket of milk, eggs, sourdough and bananas lands at $10.62 — add a bundle and delivery is free.
            </p>
          </div>
          <div className="rounded-2xl border border-line/80 bg-white p-4">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand">
              <ShieldIcon className="h-4 w-4" /> Our promise
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              If anything arrives less than fresh, tap the item in your order and we refund it immediately — no photos, no
              forms.
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-ink">
              <ClockIcon className="h-3.5 w-3.5" /> Refunds land in 1 working day
            </p>
          </div>
          <div className="rounded-2xl border border-line/80 bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">Shopping an aisle</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="press rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-brand hover:text-brand"
                >
                  {category.emoji} {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
