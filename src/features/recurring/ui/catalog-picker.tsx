"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { MinusIcon, PlusIcon, SearchIcon, SproutIcon } from "@/components/icons";

export type PickedItem = { productId: number; quantity: number; product?: Product; unitPriceCents?: number };

/**
 * Catalog picker for a recurring list.
 *
 * One search field (debounced, same `/api/search` the storefront uses) plus a
 * short "popular" list so a customer can build a basket without typing at all.
 * Quantities are steppers — no numeric keyboard, no modal per item.
 */
export function CatalogPicker({
  selected,
  onChange,
}: {
  selected: PickedItem[];
  onChange: (next: PickedItem[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query || "milk")}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          const body = (await response.json()) as { products?: Product[] };
          setResults((body.products ?? []).slice(0, 8));
        } catch {
          // keep previous results; the picker never blocks the form
        } finally {
          setLoading(false);
        }
      },
      query ? 180 : 0,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const byId = useMemo(() => new Map(selected.map((item) => [item.productId, item])), [selected]);

  const setQuantity = (product: Product, quantity: number) => {
    const clamped = Math.max(0, Math.min(20, quantity));
    const others = selected.filter((item) => item.productId !== product.id);
    onChange(
      clamped === 0
        ? others
        : [
            ...others,
            { productId: product.id, quantity: clamped, product, unitPriceCents: product.priceCents },
          ],
    );
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 bg-cream/95 px-1 pb-2 backdrop-blur">
        <div className="flex h-11 items-center gap-2 rounded-full border border-line bg-white px-3.5">
          <SearchIcon className="h-4 w-4 shrink-0 text-brand" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search milk, bread, bananas…"
            aria-label="Search the catalog to add items"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-ink-soft/70 sm:text-[13px]"
            enterKeyHint="search"
          />
        </div>
      </div>

      {loading && !results.length ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((row) => (
            <div key={row} className="shimmer h-16 rounded-xl" />
          ))}
        </div>
      ) : null}

      <ul className="divide-y divide-line/60">
        {results.map((product) => {
          const picked = byId.get(product.id);
          const quantity = picked?.quantity ?? 0;
          return (
            <li key={product.id} className="flex items-center gap-2.5 py-2">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line/60 bg-cream">
                <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-ink">{product.name}</span>
                <span className="block truncate text-[10.5px] text-ink-soft">
                  {formatMoney(product.priceCents)} · {product.unit}
                </span>
              </span>
              {quantity > 0 ? (
                <span className="flex shrink-0 items-center rounded-full border border-brand/25 bg-brand-soft/60">
                  <button
                    type="button"
                    onClick={() => setQuantity(product, quantity - 1)}
                    className="press grid h-9 w-9 place-items-center rounded-full text-brand-deep"
                    aria-label={`One fewer ${product.name}`}
                  >
                    <MinusIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                  <span
                    className="w-6 text-center text-[12.5px] font-extrabold text-brand-deep"
                    aria-live="polite"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(product, quantity + 1)}
                    disabled={quantity >= 20}
                    className="press grid h-9 w-9 place-items-center rounded-full text-brand-deep disabled:opacity-40"
                    aria-label={`One more ${product.name}`}
                  >
                    <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setQuantity(product, 1)}
                  className="press flex h-9 shrink-0 items-center gap-1 rounded-full bg-brand px-3 text-[12px] font-bold text-white"
                  aria-label={`Add ${product.name}`}
                >
                  <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.4} /> Add
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {!loading && !results.length ? (
        <p className="flex items-center gap-1.5 py-4 text-[12px] text-ink-soft">
          <SproutIcon className="h-4 w-4 text-brand" />
          Nothing by that name — try “milk”, “bread” or “bananas”.
        </p>
      ) : null}
    </div>
  );
}

export function SelectedItemRows({
  items,
  onChange,
}: {
  items: PickedItem[];
  onChange: (next: PickedItem[]) => void;
}) {
  if (!items.length) return null;
  return (
    <ul className="divide-y divide-line/60 rounded-xl border border-line/80 bg-white">
      {items.map((item) => (
        <li key={item.productId} className="flex items-center gap-2.5 px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-bold text-ink">
              {item.product?.name ?? `Product #${item.productId}`}
            </span>
            {item.product ? (
              <span className="block text-[10.5px] text-ink-soft">
                {formatMoney(item.product.priceCents)}
              </span>
            ) : null}
          </span>
          <span className="flex shrink-0 items-center rounded-full border border-line bg-cream/60">
            <button
              type="button"
              onClick={() =>
                onChange(
                  item.quantity <= 1
                    ? items.filter((entry) => entry.productId !== item.productId)
                    : items.map((entry) =>
                        entry.productId === item.productId
                          ? { ...entry, quantity: entry.quantity - 1 }
                          : entry,
                      ),
                )
              }
              className="press grid h-9 w-9 place-items-center rounded-full text-ink"
              aria-label={`Remove one ${item.product?.name ?? "item"}`}
            >
              <MinusIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
            <span className="w-6 text-center text-[12.5px] font-extrabold text-ink">{item.quantity}</span>
            <button
              type="button"
              onClick={() =>
                onChange(
                  items.map((entry) =>
                    entry.productId === item.productId
                      ? { ...entry, quantity: Math.min(20, entry.quantity + 1) }
                      : entry,
                  ),
                )
              }
              className="press grid h-9 w-9 place-items-center rounded-full text-ink"
              aria-label={`Add one ${item.product?.name ?? "item"}`}
            >
              <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
