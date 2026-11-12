"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";
import type { SearchSuggestion } from "@/components/use-search";
import { useCart } from "@/components/cart-provider";
import { ArrowRightIcon, PlusIcon, SparkleIcon } from "@/components/icons";
import { highlight } from "@/components/use-search";

type Props = {
  query: string;
  data: {
    total: number;
    trending: string[];
    intent?: { filters: string[]; corrected?: string | null } | null;
  } | null;
  loading: boolean;
  products: Product[];
  suggestions: SearchSuggestion[];
  cursor: number;
  categories: { slug: string; name: string; emoji: string }[];
  variant: "inline" | "sheet";
  setQuery: (value: string) => void;
  recents: string[];
  clearRecents: () => void;
  goProduct: (slug: string) => void;
  goHref: (href: string) => void;
  onDone: () => void;
};

/** Live result list: status strip, product rows, suggestions, idle state. */
export function SearchResults({
  query,
  data,
  loading,
  products,
  suggestions,
  cursor,
  categories,
  variant,
  setQuery,
  recents,
  clearRecents,
  goProduct,
  goHref,
  onDone,
}: Props) {
  const { add, isPending } = useCart();
  const statusRow = query ? (

    <div className="flex flex-wrap items-center gap-1.5 border-b border-line/70 bg-cream/60 px-3 py-2 text-[11px] font-semibold text-ink-soft">
      <SparkleIcon className="h-3.5 w-3.5 text-brand" />
      <span className="text-ink">Smart search</span>
      {loading ? <span>thinking…</span> : null}
      {data?.intent?.filters.map((filter) => (
        <span
          key={filter}
          className="whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-brand-deep"
        >
          {filter}
        </span>
      ))}
      {data?.intent?.corrected ? (
        <button
          type="button"
          onClick={() => setQuery(data.intent?.corrected ?? "")}
          className="rounded-lg bg-amber-soft px-2 py-1 text-left text-[11px] font-bold leading-snug text-balance text-ink"
        >
          Did you mean “{data.intent.corrected}”?
        </button>
      ) : null}
      {!loading && data ? (
        <span className="ml-auto whitespace-nowrap">
          {data.total} match{data.total === 1 ? "" : "es"}
        </span>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      {query ? (
        <>
          {statusRow}
          {!loading && data && products.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[12.5px] font-bold text-ink">No exact match for “{query}”</p>
              <p className="mx-auto mt-1 max-w-[280px] text-[11.5px] leading-relaxed text-ink-soft">
                {data?.intent?.corrected
                  ? "Try the suggestion above."
                  : "Try a shorter phrase, a budget like “under $5”, or browse an aisle."}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {(data?.trending ?? []).slice(0, 4).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="press rounded-xl border border-line px-3 py-1.5 text-left text-xs font-semibold leading-snug text-balance hover:border-brand hover:text-brand"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {products.length ? (
            <div className="p-1.5">
              <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                Products
              </p>
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${cursor === index ? "bg-cream-deep" : "hover:bg-cream/70"}`}
                >
                  <button
                    type="button"
                    onClick={() => goProduct(product.slug)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line/60 bg-cream">
<Image
                        src={product.imageUrl}
                        alt=""
                        fill
                        sizes="44px"
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-ink">
                        {highlight(product.name, query).map((part, partIndex) =>
                          part.hit ? (
                            <strong key={partIndex} className="font-extrabold text-brand-deep">
                              {part.text}
                            </strong>
                          ) : (
                            <span key={partIndex}>{part.text}</span>
                          ),
                        )}
                      </span>
                      <span className="block truncate text-[10.5px] text-ink-soft">
                        {product.brand} · {product.unit}
                      </span>
                    </span>
                  </button>
                  <span className="shrink-0 text-[12.5px] font-bold text-ink">
                    {formatMoney(product.priceCents)}
                  </span>
                  <button
                    type="button"
                    onClick={() => add(product)}
                    disabled={isPending(product.id)}
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white hover:bg-brand-deep disabled:opacity-60"
                    aria-label={`Add ${product.name} to basket`}
                  >
                    <PlusIcon className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {suggestions.length ? (
            <div className="p-1.5 pt-0">
              <p className="px-2 pb-1 pt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                Jump to
              </p>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.label}`}
                  type="button"
                  onClick={() => goHref(suggestion.href)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left ${
                    cursor === products.length + index ? "bg-cream-deep" : "hover:bg-cream/70"
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm text-brand-deep">
                    {suggestion.type === "category" ? (suggestion.emoji ?? "🧺") : "↗"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-ink">
                      {suggestion.label}
                    </span>
                    {suggestion.meta ? (
                      <span className="block truncate text-[10.5px] text-ink-soft">{suggestion.meta}</span>
                    ) : null}
                  </span>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-ink-soft" />
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-4 p-3">
          {recents.length ? (
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                  Recent searches
                </h3>
                <button
                  type="button"
                  onClick={clearRecents}
                  className="text-[11px] font-semibold text-ink-soft hover:text-brand"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recents.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="press rounded-xl border border-line px-3 py-1.5 text-left text-xs font-semibold leading-snug text-balance text-ink hover:border-brand hover:text-brand"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          <section>
            <h3 className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
              Trending now
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(data?.trending ?? ["organic bananas", "milk", "sourdough", "coffee beans"]).map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="press rounded-xl bg-cream-deep/70 px-3 py-1.5 text-left text-xs font-semibold leading-snug text-balance text-ink hover:bg-brand-soft hover:text-brand-deep"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
          {variant === "sheet" ? (
            <section>
              <h3 className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                Shop by aisle
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {categories.slice(0, 8).map((category) => (
                  <Link
                    key={category.slug}
                    href={`/category/${category.slug}`}
                    onClick={onDone}
                    className="press flex items-center gap-2 rounded-xl border border-line/80 bg-white px-2.5 py-2 text-xs font-semibold text-ink hover:border-brand"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cream-deep text-sm">
                      {category.emoji}
                    </span>
                    <span className="truncate">{category.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {variant === "sheet" ? (
            <p className="rounded-xl border border-brand/15 bg-brand-soft/60 px-3 py-2 text-[11px] leading-relaxed text-brand-deep">
              <strong>Try “dinner for two under $15”</strong> — search understands budgets, diets and
              occasions.
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}
