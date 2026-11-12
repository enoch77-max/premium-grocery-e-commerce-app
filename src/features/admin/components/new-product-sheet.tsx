"use client";

import { useState } from "react";

export function NewProductSheet({
  busy,
  onClose,
  onCreate,
}: {
  busy: boolean;
  onClose: () => void;
  onCreate: (payload: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("fresh-produce");
  const [unit, setUnit] = useState("each");
  const [price, setPrice] = useState("");
  const [compare, setCompare] = useState("");
  const [stock, setStock] = useState("25");
  const [badge, setBadge] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-ink/45 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-sheet-up sheet-scroll max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-cream p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:animate-scale-in sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">Catalogue</p>
            <h2 className="font-display text-[20px] font-semibold leading-tight">Add a product</h2>
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
          <label className="col-span-2 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Name
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Organic Hass Avocados"
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Brand
            </span>
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Fresco"
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Aisle slug
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-white px-2 text-[15px] sm:text-[13px]"
            >
              {[
                "fresh-produce",
                "bakery",
                "dairy-eggs",
                "meat-seafood",
                "pantry",
                "drinks",
                "snacks",
                "household",
              ].map((slug) => (
                <option key={slug} value={slug}>
                  {slug.replace("-", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Price ($)
            </span>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              placeholder="3.99"
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
              Unit
            </span>
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="400g punnet"
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
              placeholder="New in"
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]"
            />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Image URL
            </span>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://… (defaults to the aisle photo)"
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] sm:text-[13px]"
            />
          </label>
          <label className="col-span-2 block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Description
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] sm:text-[13px]"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onCreate({
              name,
              brand,
              categorySlug: category,
              unit,
              priceCents: Math.round(Number(price) * 100),
              compareAtCents: compare.trim() ? Math.round(Number(compare) * 100) : 0,
              stock: Number.parseInt(stock, 10) || 0,
              badge,
              imageUrl,
              description,
            })
          }
          className="press mt-3 flex h-12 w-full items-center justify-center rounded-full bg-brand text-[13.5px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create & publish"}
        </button>
      </div>
    </div>
  );
}
