import Link from "next/link";
import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/store";
import { searchCatalog, smartDefaults } from "@/lib/search";
import { CatalogListing } from "@/components/catalog-listing";
import { ArrowRightIcon, SearchIcon, SparkleIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `“${q}” — Fresco` : "Search — Fresco" };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const result = query ? searchCatalog(query, products, categories) : smartDefaults(products, categories);
  const hasResults = result.products.length > 0;

  return (
    <div className="mx-auto max-w-[1340px] 2xl:max-w-[1600px] px-4 pt-5 sm:px-6">
      <div className="rounded-[26px] border border-line/70 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">
          <SparkleIcon className="h-3.5 w-3.5" /> Smart search
          {query ? <span className="text-ink-soft">· budget, diet &amp; occasion aware</span> : null}
        </div>
        <h1 className="mt-2 font-display text-[27px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">
          {query ? (
            <>
              Results for <span className="text-brand-deep">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            "What are we cooking this week?"
          )}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] text-ink-soft">
            {hasResults ? `${result.products.length} matches` : "No matches yet"}
            {result.intent.filters.length ? ` · ${result.intent.filters.join(" · ")}` : ""}
          </p>
          {result.intent.corrected ? (
            <Link
              href={`/search?q=${encodeURIComponent(result.intent.corrected)}`}
              className="rounded-lg bg-amber-soft px-2.5 py-1 text-left text-[11px] font-bold leading-snug text-balance text-ink hover:bg-amber"
            >
              Did you mean “{result.intent.corrected}”?
            </Link>
          ) : null}
        </div>

        {result.suggestions.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.suggestions.map((suggestion) => (
              <Link
                key={`${suggestion.type}-${suggestion.label}`}
                href={suggestion.href}
                className="press inline-flex items-start gap-1.5 rounded-xl border border-line bg-cream/70 px-3 py-1.5 text-left text-[11.5px] font-semibold leading-snug text-balance text-ink hover:border-brand hover:text-brand"
              >
                {suggestion.type === "category" ? suggestion.emoji : <SearchIcon className="h-3 w-3" />}
                {suggestion.label}
                <ArrowRightIcon className="h-3 w-3" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {hasResults ? (
        <div className="mt-5">
          <CatalogListing
            products={result.products}
            emptyMessage="Try a broader phrase or browse an aisle."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border border-dashed border-line bg-white/70 p-6">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-2xl">🧺</div>
            <h2 className="mt-3 font-display text-2xl font-semibold">Let&apos;s find the good stuff</h2>
            <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-soft">
              Search understands budgets, diets and occasions — try a few of these.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {result.trending.map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="press rounded-xl border border-line bg-white px-3 py-1.5 text-left text-[11.5px] font-semibold leading-snug text-balance text-ink hover:border-brand hover:text-brand"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-line/80 bg-white p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">Shop by aisle</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="press flex items-center gap-2 rounded-xl border border-line/70 px-2.5 py-2 text-[12px] font-semibold hover:border-brand"
                >
                  <span className="text-base">{category.emoji}</span>
                  <span className="truncate">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
