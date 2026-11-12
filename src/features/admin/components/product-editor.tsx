"use client";

import { useState } from "react";

export type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  categorySlug: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  isActive: boolean;
  badge: string | null;
};

export function ProductEditor({
  product,
  busy,
  onClose,
  onSave,
}: {
  product: AdminProduct;
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Partial<AdminProduct>) => void;
}) {
  const [price, setPrice] = useState((product.priceCents / 100).toFixed(2));
  const [compare, setCompare] = useState(
    product.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : "",
  );
  const [stock, setStock] = useState(String(product.stock));
  const [badge, setBadge] = useState(product.badge ?? "");

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-sheet-up safe-b w-full max-w-md rounded-t-3xl border border-line bg-cream p-4 sm:animate-scale-in sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">Edit product</p>
            <h2 className="font-display text-[20px] font-semibold leading-tight">{product.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press tap-xl grid place-items-center rounded-full bg-white text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Price ($)
            </span>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Was ($)
            </span>
            <input
              value={compare}
              onChange={(event) => setCompare(event.target.value)}
              inputMode="decimal"
              placeholder="optional"
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Stock
            </span>
            <input
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              inputMode="numeric"
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Badge
            </span>
            <input
              value={badge}
              onChange={(event) => setBadge(event.target.value)}
              placeholder="e.g. Bestseller"
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({
              priceCents: Math.max(1, Math.round(Number(price) * 100) || product.priceCents),
              compareAtCents: compare.trim() ? Math.max(0, Math.round(Number(compare) * 100)) : 0,
              stock: Math.max(0, Number.parseInt(stock, 10) || 0),
              badge,
            })
          }
          className="press mt-3 flex h-12 w-full items-center justify-center rounded-full bg-brand text-[13.5px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
