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
    (a, b) =>
      discountPercent(b.priceCents, b.compareAtCents) - discountPercent(a.priceCents, a.compareAtCents),
  )[0];
  const avgPrice = items.length
    ? Math.round(items.reduce((sum, product) => sum + product.priceCents, 0) / items.length)
    : 0;

  return (
    <div className="mx-auto max-w-[1340px] 2xl:max-w-[1600px] px-4 pt-4 sm:px-6 sm:pt-5">
      <nav className="flex items-center gap-1 text-[11px] font-medium text-ink-soft">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <ChevronRightIcon className="h-3 w-3" />
        <span className="font-semibold text-ink">{category.name}</span>
      </nav>

      {/* Compact aisle header: identity on the left, the two numbers that matter
          on the right. The old version stacked a badge, headline, paragraph, three
          chips and a second info panel for the same facts. */}
      <section className="mt-2.5 flex items-center gap-3 rounded-2xl border border-line/70 bg-white px-3 py-2.5 sm:gap-4 sm:px-4">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line/60 bg-cream sm:h-14 sm:w-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={category.imageUrl} alt="" className="h-full w-full object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[20px] font-semibold leading-tight tracking-[-0.02em] sm:text-[24px]">
            {category.name}
          </h1>
          <p className="truncate text-[11px] text-ink-soft">
            {items.length} products · same-day from 30 min · {formatMoney(avgPrice)} avg
          </p>
        </div>
        {bestDeal?.compareAtCents ? (
          <Link
            href={`/product/${bestDeal.slug}`}
            className="press hidden shrink-0 rounded-full bg-rose-soft px-3 py-1.5 text-[11px] font-bold text-clay sm:block"
          >
            Save {discountPercent(bestDeal.priceCents, bestDeal.compareAtCents)}% today
          </Link>
        ) : null}
        <Link
          href="/offers#bundles"
          className="press hidden shrink-0 items-center gap-1 text-[11px] font-bold text-brand hover:underline lg:flex"
        >
          Bundles <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </section>

      <div className="mt-3 grid gap-5 sm:mt-4 lg:grid-cols-[220px_1fr]">
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
                    <span
                      className={`flex-1 truncate text-[12px] ${item.slug === category.slug ? "font-extrabold text-brand-deep" : "font-semibold text-ink"}`}
                    >
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
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-deep">
                Fresh week
              </p>
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
