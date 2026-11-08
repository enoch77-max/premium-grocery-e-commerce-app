"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, Product, SearchResponse } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { ArrowRightIcon, CloseIcon, PlusIcon, SearchIcon, SparkleIcon } from "@/components/icons";

const RECENT_KEY = "fresco:recent-searches";

export function SearchOverlay({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  const router = useRouter();
  const { add, isPending } = useCart();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    try {
      const stored = window.localStorage.getItem(RECENT_KEY);
      if (stored) setRecents(JSON.parse(stored) as string[]);
    } catch {
      // ignore
    }
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as SearchResponse;
        setData(result);
        setCursor(-1);
      } catch {
        // aborted or offline
      } finally {
        setLoading(false);
      }
    }, query ? 170 : 0);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  const remember = useCallback((term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    setRecents((prev) => {
      const next = [cleaned, ...prev.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, 5);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const goToSearch = useCallback(
    (term: string) => {
      remember(term);
      onClose();
      router.push(`/search?q=${encodeURIComponent(term)}`);
    },
    [onClose, remember, router],
  );

  const products = data?.products.slice(0, 6) ?? [];
  const suggestions = data?.suggestions ?? [];
  const optionTotal = products.length + suggestions.length;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((prev) => (optionTotal ? (prev + 1) % optionTotal : -1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((prev) => (optionTotal ? (prev - 1 + optionTotal) % optionTotal : -1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (cursor >= 0 && cursor < products.length) {
        const product = products[cursor];
        remember(query || product.name);
        onClose();
        router.push(`/product/${product.slug}`);
        return;
      }
      if (cursor >= products.length) {
        const suggestion = suggestions[cursor - products.length];
        if (suggestion) {
          onClose();
          router.push(suggestion.href);
        }
        return;
      }
      if (query.trim()) goToSearch(query);
    }
  };

  const interpreted = useMemo(() => {
    if (!data?.intent) return null;
    return data.intent;
  }, [data]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-center px-3 pt-[4vh] sm:px-6 sm:pt-[8vh]" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        className="animate-scale-in relative w-full max-w-3xl overflow-hidden rounded-[26px] border border-line bg-white shadow-[0_40px_120px_-30px_rgba(19,38,29,0.5)]"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line/80 px-4 py-3.5 sm:px-5">
          <SearchIcon className="h-5 w-5 shrink-0 text-brand" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search milk, avocados, sourdough… try “breakfast under $10”"
            className="w-full bg-transparent text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-soft/70"
            aria-label="Search groceries"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="press rounded-full p-1.5 text-ink-soft hover:bg-cream-deep"
              aria-label="Clear search"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="press hidden shrink-0 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-ink-soft sm:block"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[64vh] overflow-y-auto overscroll-contain">
          {query ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-cream/60 px-4 py-2.5 text-[11px] font-semibold text-ink-soft sm:px-5">
              <SparkleIcon className="h-3.5 w-3.5 text-brand" />
              <span className="text-ink">Smart search</span>
              {loading ? <span className="text-ink-soft">thinking…</span> : null}
              {interpreted?.filters.map((filter) => (
                <span key={filter} className="rounded-full bg-brand-soft px-2 py-0.5 text-brand-deep">
                  {filter}
                </span>
              ))}
              {interpreted?.corrected ? (
                <button
                  type="button"
                  onClick={() => setQuery(interpreted.corrected ?? "")}
                  className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-bold text-ink"
                >
                  Did you mean “{interpreted.corrected}”?
                </button>
              ) : null}
              {!loading && data ? <span className="ml-auto text-ink-soft">{data.total} matches</span> : null}
            </div>
          ) : null}

          {!query ? (
            <div className="space-y-5 px-4 py-4 sm:px-5">
              {recents.length ? (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">Recent searches</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setRecents([]);
                        window.localStorage.removeItem(RECENT_KEY);
                      }}
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
                        className="press rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">Trending now</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(data?.trending ?? ["organic bananas", "milk", "sourdough", "coffee beans"]).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="press rounded-full bg-cream-deep/70 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-brand-soft hover:text-brand-deep"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">Shop by aisle</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {categories.slice(0, 8).map((category) => (
                    <Link
                      key={category.slug}
                      href={`/category/${category.slug}`}
                      onClick={onClose}
                      className="press flex items-center gap-2 rounded-xl border border-line/80 bg-white px-2.5 py-2 text-xs font-semibold text-ink hover:border-brand"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-cream-deep text-sm">
                        {category.emoji}
                      </span>
                      <span className="truncate">{category.name}</span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-brand/15 bg-brand-soft/60 px-3.5 py-3 text-xs text-brand-deep">
                <span className="font-bold">Try “dinner for two under $15”</span> or “vegan snacks” — search understands
                budgets, diets and occasions.
              </section>
            </div>
          ) : (
            <div className="pb-2">
              {loading && !data ? (
                <div className="space-y-2 p-4">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center gap-3">
                      <div className="shimmer h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="shimmer h-3 w-2/3 rounded" />
                        <div className="shimmer h-3 w-1/3 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {!loading && data && products.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-cream-deep text-xl">🥕</div>
                  <p className="font-semibold text-ink">No exact match for “{query}”</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {interpreted?.corrected
                      ? "We think you meant something else — try the suggestion above."
                      : "Try a shorter phrase, a budget like “under $5”, or browse an aisle below."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {(data.trending ?? []).slice(0, 4).map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="press rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {products.length ? (
                <div className="px-2 pt-2">
                  <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                    Products
                  </p>
                  {products.map((product, index) => (
                    <SearchProductRow
                      key={product.id}
                      product={product}
                      active={cursor === index}
                      onHover={() => setCursor(index)}
                      onSelect={() => {
                        remember(query);
                        onClose();
                        router.push(`/product/${product.slug}`);
                      }}
                      onAdd={() => add(product)}
                      pending={isPending(product.id)}
                    />
                  ))}
                </div>
              ) : null}

              {suggestions.length ? (
                <div className="mt-1 px-2 pb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                    Jump to
                  </p>
                  {suggestions.map((suggestion, index) => {
                    const active = cursor === products.length + index;
                    return (
                      <button
                        key={`${suggestion.type}-${suggestion.label}`}
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(suggestion.href);
                        }}
                        onMouseEnter={() => setCursor(products.length + index)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                          active ? "bg-cream-deep" : "hover:bg-cream/70"
                        }`}
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-sm text-brand-deep">
                          {suggestion.type === "category" ? suggestion.emoji ?? "🧺" : "↗"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-ink">{suggestion.label}</span>
                          {suggestion.meta ? (
                            <span className="block truncate text-[11px] text-ink-soft">{suggestion.meta}</span>
                          ) : null}
                        </span>
                        <ArrowRightIcon className="h-4 w-4 text-ink-soft" />
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {products.length ? (
                <div className="sticky bottom-0 mt-2 flex items-center justify-between gap-3 border-t border-line/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
                  <span className="hidden text-[11px] font-medium text-ink-soft sm:block">
                    ↑↓ to browse · Enter to open
                  </span>
                  <button
                    type="button"
                    onClick={() => goToSearch(query)}
                    className="press ml-auto inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-cream hover:bg-brand-deep"
                  >
                    See all {data?.total ?? products.length} results
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchProductRow({
  product,
  active,
  onHover,
  onSelect,
  onAdd,
  pending,
}: {
  product: Product;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  onAdd: () => void;
  pending: boolean;
}) {
  return (
    <div
      onMouseEnter={onHover}
      className={`group flex items-center gap-3 rounded-xl px-2 py-1.5 transition ${active ? "bg-cream-deep" : "hover:bg-cream/70"}`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-line/70 bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {product.name}
            {product.compareAtCents ? (
              <span className="ml-2 rounded bg-rose-soft px-1.5 py-0.5 text-[10px] font-bold text-clay">
                Save {formatMoney(product.compareAtCents - product.priceCents)}
              </span>
            ) : null}
          </span>
          <span className="block truncate text-[11px] text-ink-soft">
            {product.brand} · {product.unit}
          </span>
        </span>
      </button>
      <span className="text-sm font-bold text-ink">{formatMoney(product.priceCents)}</span>
      <button
        type="button"
        onClick={onAdd}
        disabled={pending}
        className="press grid h-8 w-8 place-items-center rounded-full bg-brand text-white hover:bg-brand-deep disabled:opacity-60"
        aria-label={`Add ${product.name} to basket`}
      >
        <PlusIcon className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  );
}
