import Link from "next/link";
import { getBundles, getCategories, getOffers, getProducts } from "@/lib/store";
import { discountPercent } from "@/lib/format";
import { MiniOfferCard, OfferHero } from "@/components/offer-carousel";
import { ProductRail } from "@/components/product-rail";
import { ProductCard } from "@/components/product-card";
import { BundleCard } from "@/components/bundle-card";
import { SavingsLadder } from "@/components/savings-ladder";
import { NextSlotCard } from "@/components/next-slot-card";
import { DealCountdown } from "@/components/deal-countdown";
import { SectionHeading } from "@/components/section-heading";
import {
  ArrowRightIcon,
  BoltIcon,
  LeafIcon,
  ShieldIcon,
  StarIcon,
  TruckIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

const services = [
  { icon: BoltIcon, title: "30-minute delivery", note: "7 days · 7am–10pm" },
  { icon: LeafIcon, title: "Farm-fresh, always", note: "Harvested within 48h" },
  { icon: TruckIcon, title: "Free delivery over $35", note: "No membership needed" },
  { icon: ShieldIcon, title: "Freshness guarantee", note: "Not happy? We refund it" },
];

const reviews = [
  {
    name: "Maya R.",
    area: "Park Slope",
    quote:
      "The produce actually tastes like produce. I ordered at 6:40pm and the avocados were on my counter before bath time.",
  },
  {
    name: "Daniel K.",
    area: "Carroll Gardens",
    quote:
      "The breakfast bundle plus a coffee subscription replaced two separate shops for us. Basket savings are real, not theatre.",
  },
  {
    name: "Priya S.",
    area: "Windsor Terrace",
    quote:
      "I asked search for “dinner for four under $25” and it built half my basket. Genuinely the smartest grocery search I've used.",
  },
];

export default async function HomePage() {
  const [categories, products, offers, bundles] = await Promise.all([
    getCategories(),
    getProducts(),
    getOffers(),
    getBundles(),
  ]);

  const deals = [...products]
    .filter((product) => product.compareAtCents && product.compareAtCents > product.priceCents)
    .sort((a, b) => discountPercent(b.priceCents, b.compareAtCents) - discountPercent(a.priceCents, a.compareAtCents))
    .slice(0, 8);

  const bestsellers = [...products]
    .sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller) || b.popularity - a.popularity)
    .slice(0, 10);

  const underFive = [...products]
    .filter((product) => product.priceCents <= 500)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 8);

  const featuredBundle = bundles[0];

  return (
    <div className="mx-auto max-w-[1340px] px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => (
          <div
            key={service.title}
            className="flex items-center gap-3 rounded-2xl border border-line/70 bg-white/70 px-3.5 py-2.5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep">
              <service.icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-ink">{service.title}</p>
              <p className="truncate text-[10.5px] text-ink-soft">{service.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[152px] space-y-3">
            <nav className="overflow-hidden rounded-2xl border border-line/80 bg-white">
              <p className="border-b border-line/70 px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
                Shop by aisle
              </p>
              <div className="p-1.5">
                {categories.map((category) => {
                  const count = products.filter((product) => product.categorySlug === category.slug).length;
                  return (
                    <Link
                      key={category.slug}
                      href={`/category/${category.slug}`}
                      className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-cream"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-cream-deep/70 text-[15px] transition group-hover:bg-brand-soft">
                        {category.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-ink">{category.name}</span>
                        <span className="block text-[10px] text-ink-soft">{count} products</span>
                      </span>
                      <ArrowRightIcon className="h-3.5 w-3.5 text-ink-soft/50 transition group-hover:translate-x-0.5 group-hover:text-brand" />
                    </Link>
                  );
                })}
              </div>
              <Link
                href="/offers"
                className="flex items-center justify-between border-t border-line/70 bg-brand-soft/40 px-3.5 py-2.5 text-[11.5px] font-bold text-brand-deep hover:bg-brand-soft"
              >
                All offers & coupons <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </nav>

            <NextSlotCard />
          </div>
        </aside>

        <div className="min-w-0 space-y-9 sm:space-y-12">
          <section className="grid gap-3 lg:grid-cols-[1.72fr_1fr]">
            <OfferHero offers={offers} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {offers.slice(3, 5).map((offer) => (
                <MiniOfferCard key={offer.slug} offer={offer} />
              ))}
            </div>
          </section>

          <section>
            <SectionHeading
              eyebrow="Today's deals"
              title="Price drops worth a detour"
              subtitle="Updated every morning. When they're gone, they're gone."
              href="/category/fresh-produce"
              actionLabel="Shop deals"
              trailing={<DealCountdown />}
            />
            <ProductRail products={deals} />
          </section>

          <section>
            <SectionHeading
              eyebrow="Shop by aisle"
              title="Everything for the week ahead"
              subtitle="Eight aisles, one basket, zero queues."
              href="/search?q=organic"
              actionLabel="Browse all"
            />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-line/80 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-card"
                >
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line/60 bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-bold text-ink">{category.name}</span>
                    <span className="block truncate text-[10px] text-ink-soft">{category.tagline}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading
              eyebrow="Loved by 12,000+ households"
              title="Bestsellers this week"
              subtitle="The items that keep reappearing in baskets across the neighbourhood."
              href="/search?q=bestsellers"
              actionLabel="See bestsellers"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {bestsellers.slice(0, 10).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          <SavingsLadder bundle={featuredBundle} />

          <section>
            <SectionHeading
              eyebrow="Bundle & save"
              title="One tap. A whole meal sorted."
              subtitle="Curated baskets priced below the sum of their parts — add every item at once."
              href="/offers#bundles"
              actionLabel="All bundles"
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {bundles.map((bundle) => (
                <BundleCard key={bundle.slug} bundle={bundle} />
              ))}
            </div>
          </section>

          <section>
            <SectionHeading
              eyebrow="Small prices, big basket"
              title="Everyday essentials under $5"
              subtitle="Good food shouldn't need a budget meeting."
              href="/search?q=under+%245"
              actionLabel="Shop under $5"
            />
            <ProductRail products={underFive} />
          </section>

          <section className="grid gap-3 lg:grid-cols-[1.05fr_1fr]">
            <div className="rounded-3xl border border-line/80 bg-white p-5 sm:p-6">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Why Fresco</p>
              <h2 className="mt-1.5 font-display text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
                Groceries without the
                <br /> admin.
              </h2>
              <div className="mt-4 space-y-3">
                {[
                  { title: "Pick a slot, not a queue", note: "Same-day 30-minute delivery or a 2-hour window you choose." },
                  { title: "Prices that don't need a coupon", note: "Weekly multi-buys and honest unit pricing on every card." },
                  { title: "One-tap reordering", note: "Your basket saves itself, so next week's shop is a two-tap job." },
                ].map((step, index) => (
                  <div key={step.title} className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-extrabold text-lime">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[12.5px] font-bold text-ink">{step.title}</p>
                      <p className="text-[11px] leading-relaxed text-ink-soft">{step.note}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-4 border-t border-line/70 pt-4">
                <div className="flex items-center gap-1 text-amber">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <StarIcon key={star} className="h-3.5 w-3.5" />
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-ink">
                  4.9/5 average <span className="font-medium text-ink-soft">· 2,180 verified reviews</span>
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {reviews.slice(0, 2).map((review) => (
                <div key={review.name} className="rounded-2xl border border-line/80 bg-white p-4">
                  <div className="flex items-center gap-0.5 text-amber">
                    {[0, 1, 2, 3, 4].map((star) => (
                      <StarIcon key={star} className="h-3 w-3" />
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-ink">&ldquo;{review.quote}&rdquo;</p>
                  <p className="mt-2 text-[10.5px] font-bold text-ink-soft">
                    {review.name} · {review.area}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-line/80 bg-cream-deep/60 p-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
                  Free delivery threshold
                </p>
                <p className="mt-1 font-display text-[22px] font-semibold leading-none">$35</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                  Most baskets hit it with a bundle. Or use code{" "}
                  <span className="font-bold text-ink">FREEDEL</span> on $25+.
                </p>
                <Link
                  href="/offers#coupons"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                >
                  See all coupons <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </section>

          <Link
            href="/offers"
            className="group flex flex-col items-start justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-[#0e5c3d] via-[#136b47] to-[#1b8055] p-5 text-cream sm:flex-row sm:items-center sm:p-6"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl">🎁</span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-lime">Offers & coupons</p>
                <h2 className="font-display text-[22px] font-semibold leading-tight sm:text-[26px]">
                  $10 off your first $60 — plus free delivery.
                </h2>
                <p className="mt-0.5 text-[11.5px] text-cream/70">
                  FRESH10 stacks with $35+ free delivery and every weekly multi-buy.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2.5 text-[12px] font-bold text-brand-deep transition group-hover:bg-white">
              Browse every offer <ArrowRightIcon className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
