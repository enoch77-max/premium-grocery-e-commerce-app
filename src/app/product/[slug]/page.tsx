import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBundles, getCategories, getProductBySlug, getProducts } from "@/lib/store";
import { discountPercent, formatMoney } from "@/lib/format";
import { ProductGallery } from "@/components/product-gallery";
import { ProductBuyPanel } from "@/components/product-buy-panel";
import { FrequentlyBought } from "@/components/frequently-bought";
import { ProductRail } from "@/components/product-rail";
import { ProductCard } from "@/components/product-card";
import { BundleCard } from "@/components/bundle-card";
import { SectionHeading } from "@/components/section-heading";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  LeafIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found — Fresco" };
  return {
    title: `${product.name} — Fresco`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, categories, products, bundles] = await Promise.all([
    getProductBySlug(slug),
    getCategories(),
    getProducts(),
    getBundles(),
  ]);

  if (!product) notFound();

  const category = categories.find((item) => item.slug === product.categorySlug);
  const others = products.filter((item) => item.id !== product.id);

  const companionPool = others
    .filter((item) => item.categorySlug !== product.categorySlug)
    .map((item) => ({
      item,
      score:
        item.tags.filter((tag) => product.tags.includes(tag)).length * 10 +
        item.popularity +
        (item.categorySlug === "bakery" || item.categorySlug === "dairy-eggs" ? 6 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const companions: typeof products = [];
  const seenCompanionIds = new Set<number>([product.id]);
  for (const candidate of companionPool) {
    if (companions.length >= 2) break;
    if (seenCompanionIds.has(candidate.item.id)) continue;
    if (companions.some((existing) => existing.categorySlug === candidate.item.categorySlug)) continue;
    companions.push(candidate.item);
    seenCompanionIds.add(candidate.item.id);
  }
  for (const candidate of companionPool) {
    if (companions.length >= 2) break;
    if (seenCompanionIds.has(candidate.item.id)) continue;
    companions.push(candidate.item);
    seenCompanionIds.add(candidate.item.id);
  }

  const related = others
    .filter((item) => item.categorySlug === product.categorySlug)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 4);

  const alsoBought = others
    .filter((item) => !related.some((rel) => rel.id === item.id))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5);

  const matchingBundle =
    bundles.find((bundle) => bundle.itemSlugs.includes(product.slug)) ??
    bundles.find((bundle) => bundle.itemSlugs.length > 0) ??
    bundles[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
    offers: {
      "@type": "Offer",
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="mx-auto max-w-[1340px] 2xl:max-w-[1600px] px-4 pb-24 pt-2 sm:px-6 sm:pt-5 lg:pb-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Phone order: a compact breadcrumb, then the photo, then the name and
          price. Previously the image filled the whole first screen, so opening
          a product looked like nothing had happened. */}
      <nav
        className="mb-2 flex items-center gap-1 text-[11px] font-medium text-ink-soft lg:hidden"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <ChevronRightIcon className="h-3 w-3 shrink-0" />
        <Link href={`/category/${product.categorySlug}`} className="truncate hover:text-brand">
          {category?.name ?? "Shop"}
        </Link>
        <ChevronRightIcon className="h-3 w-3 shrink-0" />
        <span className="truncate font-semibold text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-3 sm:gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
        <div className="lg:sticky lg:top-[122px]">
          <ProductGallery product={product} categoryName={category?.name ?? "Fresco"} />
        </div>
        <ProductBuyPanel product={product} categoryName={category?.name ?? "Fresco"} />
      </div>

      <div className="mt-8 space-y-8">
        <FrequentlyBought product={product} companions={companions} />

        {matchingBundle ? (
          <section className="rounded-[24px] border border-line/80 bg-white p-4 sm:p-5">
            <SectionHeading
              eyebrow="Better together"
              title={`Put it in a bundle and save`}
              subtitle={`${matchingBundle.title} is already discounted against usual prices — add the whole basket in one tap.`}
              href="/offers#bundles"
              actionLabel="All bundles"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-cream/70 p-3.5 sm:col-span-2 lg:col-span-2">
                <p className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-brand">
                  <SparkleIcon className="h-3 w-3" /> Why bundles convert
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                  Bundles remove the &ldquo;what else do I need?&rdquo; pause. Every basket below is priced
                  from the exact items and their live multi-buy savings — what you see is what the basket
                  charges.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-semibold text-ink">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-2.5 py-1">
                    <TruckIcon className="h-3.5 w-3.5 text-brand" /> Free delivery over $35
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-2.5 py-1">
                    <LeafIcon className="h-3.5 w-3.5 text-brand" /> Freshness guaranteed
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-2.5 py-1">
                    <CheckIcon className="h-3.5 w-3.5 text-brand" /> Save{" "}
                    {formatMoney(matchingBundle.compareAtCents - matchingBundle.priceCents)}
                  </span>
                </div>
              </div>
              <BundleCard bundle={matchingBundle} />
            </div>
          </section>
        ) : null}

        {related.length ? (
          <section>
            <SectionHeading
              eyebrow={category?.name ?? "This aisle"}
              title={`More from ${category?.name.toLowerCase() ?? "this aisle"}`}
              subtitle="Same delivery window, same freshness promise."
              href={`/category/${product.categorySlug}`}
              actionLabel={`Shop ${category?.name ?? "aisle"}`}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <SectionHeading
            eyebrow="Customers also bought"
            title="The rest of the basket"
            subtitle="Popular add-ons that pair with almost everything."
            href="/search?q=bestsellers"
            actionLabel="See bestsellers"
          />
          <ProductRail products={alsoBought} />
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: TruckIcon,
              title: "From our shelves to your door",
              note: "Delivered in 30 minutes or a slot you choose. Free over $35.",
            },
            {
              icon: ShieldIcon,
              title: "Freshness, guaranteed twice",
              note: "Checked when packed and again by your driver. Refund in one tap.",
            },
            {
              icon: LeafIcon,
              title: "Fewer vans, less waste",
              note: "Route-planned deliveries and returnable glass on every bottle.",
            },
          ].map((promise) => (
            <div key={promise.title} className="rounded-2xl border border-line/80 bg-white p-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand">
                <promise.icon className="h-4.5 w-4.5" />
              </span>
              <p className="mt-2 text-[12px] font-bold text-ink">{promise.title}</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-soft">{promise.note}</p>
            </div>
          ))}
        </section>

        <Link
          href="/offers"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-line/80 bg-cream-deep/50 p-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl">🎁</span>
            <div>
              <p className="text-[12px] font-bold text-ink">
                Put it in a bundle and save{" "}
                {formatMoney(Math.max(0, matchingBundle.compareAtCents - matchingBundle.priceCents))} vs usual
                prices
              </p>
              <p className="text-[10.5px] text-ink-soft">
                Free delivery on baskets over $35, and FRESH10 takes $10 off any $60+ order.
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-brand">
            All offers <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
