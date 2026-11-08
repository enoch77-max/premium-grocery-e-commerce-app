import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/store";
import { discountPercent, formatMoney } from "@/lib/format";
import { CatalogListing } from "@/components/catalog-listing";
import { ArrowRightIcon, BoltIcon, ChevronRightIcon, SparkleIcon, TruckIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((item) => item.slug === slug);
  return {
    title: category ? `${category.name} — Fresco` : "Aisle — Fresco",
    description: category?.tagline,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const items = products.filter((product) => product.categorySlug === slug);
  const deals = items.filter((product) => product.compareAtCents);
  const bestDeal = [...items].sort(
    (a, b) => discountPercent(b.priceCents, b.compareAtCents) - discountPercent(a.priceCents, a.compareAtCents),
  )[0];
  const avgPrice = items.length ? Math.round(items.reduce((sum, product) => sum + product.priceCents, 0) / items.length) : 0;

  return (
    <div className="mx-auto max-w-[1340px] px-4 pt-4 sm:px-6 sm:pt-5">
      <nav className="flex items-center gap-1 text-[11px] font-medium text-ink-soft">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <ChevronRightIcon className="h-3 w-3" />
        <span className="font-semibold text-ink">{category.name}</span>
      </nav>

      <section className="mt-3 overflow-hidden rounded-[26px] border border-line/70 bg-white">
        <div className="grid gap-0 lg:grid-cols-[1.55fr_1fr]">
          <div className="p-5 sm:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-deep">
              <span className="text-[12px]">{category.emoji}</span> Aisle
            </span>
            <h1 className="mt-2.5 font-display text-[30px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[38px]">
              {category.name}
            </h1>
            <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-soft">
              {category.tagline}. {items.length} carefully chosen products, with same-day delivery from 30 minutes.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {deals.length ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-soft px-2.5 py-1 text-[11px] font-bold text-clay">
                  <SparkleIcon className="h-3 w-3" /> {deals.length} on offer today
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-ink">
                <TruckIcon className="h-3.5 w-3.5 text-brand" /> Free delivery over $35
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-ink">
                <BoltIcon className="h-3 w-3 text-amber" /> 30-min slots
              </span>
            </div>
          </div>
          <div className="relative flex items-center gap-3 border-t border-line/70 bg-cream/60 p-4 lg:border-l lg:border-t-0">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-line bg-white sm:h-24 sm:w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 space-y-1.5 text-[11px]">
              {bestDeal?.compareAtCents ? (
                <Link href={`/product/${bestDeal.slug}`} className="block rounded-xl bg-white px-2.5 py-1.5 hover:shadow-card">
                  <p className="font-bold text-clay">
                    Save {discountPercent(bestDeal.priceCents, bestDeal.compareAtCents)}% today
                  </p>
                  <p className="truncate text-[10.5px] text-ink-soft">{bestDeal.name}</p>
                </Link>
              ) : null}
              <div className="rounded-xl bg-white px-2.5 py-1.5">
                <p className="font-bold text-ink">Avg. {formatMoney(avgPrice)} per item</p>
                <p className="text-[10.5px] text-ink-soft">No hidden fees, ever</p>
              </div>
              <Link
                href="/offers#bundles"
                className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
              >
                Bundle this aisle <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[152px] space-y-3">
            <nav className="overflow-hidden rounded-2xl border border-line/80 bg-white">
              <p className="border-b border-line/70 px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
                All aisles
              </p>
              <div className="p-1.5">
                {categories.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/category/${item.slug}`}
                    className={`flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-cream ${
                      item.slug === category.slug ? "bg-cream" : ""
                    }`}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-cream-deep/70 text-[14px]">
                      {item.emoji}
                    </span>
                    <span className={`flex-1 truncate text-[12px] ${item.slug === category.slug ? "font-extrabold text-brand-deep" : "font-semibold text-ink"}`}>
                      {item.name}
                    </span>
                    <span className="text-[10px] font-medium text-ink-soft">
                      {products.filter((product) => product.categorySlug === item.slug).length}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
            <div className="rounded-2xl border border-brand/20 bg-brand-soft/60 p-3.5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-deep">Fresh week</p>
              <p className="mt-1 font-display text-[17px] font-semibold leading-tight text-ink">
                Up to 40% off produce
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">
                New markdowns land every morning at 6am.
              </p>
              <Link
                href="/offers"
                className="press mt-2 flex h-8 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-white"
              >
                See today&apos;s offers
              </Link>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <CatalogListing
            products={items}
            emptyMessage={`Try clearing a filter, or browse another aisle — ${category.name.toLowerCase()} restocks every morning.`}
          />
        </div>
      </div>
    </div>
  );
}
