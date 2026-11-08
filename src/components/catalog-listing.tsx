"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { discountPercent } from "@/lib/format";
import { ProductCard } from "@/components/product-card";
import { CloseIcon, SparkleIcon } from "@/components/icons";

const DIETS = [
  { id: "deals", label: "On offer" },
  { id: "organic", label: "Organic" },
  { id: "vegan", label: "Vegan" },
  { id: "new", label: "New in" },
  { id: "under5", label: "Under $5" },
] as const;

type DietId = (typeof DIETS)[number]["id"];

const SORTS = [
  { id: "popular", label: "Most popular" },
  { id: "discount", label: "Biggest saving" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "rating", label: "Top rated" },
  { id: "new", label: "Newest first" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

export function CatalogListing({
  products,
  emptyMessage = "No products match those filters yet.",
}: {
  products: Product[];
  emptyMessage?: string;
}) {
  const [sort, setSort] = useState<SortId>("popular");
  const [active, setActive] = useState<DietId[]>([]);

  const toggle = (id: DietId) => {
    setActive((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const filtered = useMemo(() => {
    let list = [...products];

    if (active.includes("deals")) list = list.filter((product) => product.compareAtCents);
    if (active.includes("organic")) list = list.filter((product) => product.isOrganic);
    if (active.includes("vegan")) list = list.filter((product) => product.isVegan);
    if (active.includes("new")) list = list.filter((product) => product.isNew);
    if (active.includes("under5")) list = list.filter((product) => product.priceCents <= 500);

    switch (sort) {
      case "discount":
        list.sort(
          (a, b) =>
            discountPercent(b.priceCents, b.compareAtCents) - discountPercent(a.priceCents, a.compareAtCents),
        );
        break;
      case "price-asc":
        list.sort((a, b) => a.priceCents - b.priceCents);
        break;
      case "price-desc":
        list.sort((a, b) => b.priceCents - a.priceCents);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case "new":
        list.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.popularity - a.popularity);
        break;
      default:
        list.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller) || b.popularity - a.popularity);
    }
    return list;
  }, [active, products, sort]);

  return (
    <div>
      <div className="sticky top-[114px] z-30 -mx-1 mb-4 rounded-2xl border border-line/80 bg-cream/95 px-2.5 py-2 backdrop-blur-md sm:top-[118px]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActive([])}
              className={`press shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
                active.length === 0
                  ? "bg-ink text-cream"
                  : "border border-line bg-white text-ink-soft hover:border-brand hover:text-brand"
              }`}
            >
              All
            </button>
            {DIETS.map((diet) => {
              const isActive = active.includes(diet.id);
              return (
                <button
                  key={diet.id}
                  type="button"
                  onClick={() => toggle(diet.id)}
                  className={`press shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${
                    isActive
                      ? "bg-brand text-white"
                      : "border border-line bg-white text-ink-soft hover:border-brand hover:text-brand"
                  }`}
                >
                  {diet.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] font-medium text-ink-soft sm:inline">
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </span>
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortId)}
                aria-label="Sort products"
                className="h-8 appearance-none rounded-full border border-line bg-white pl-3 pr-7 text-[11.5px] font-semibold text-ink outline-none hover:border-brand"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-ink-soft">
                ▼
              </span>
            </div>
          </div>
        </div>
        {active.length ? (
          <div className="mt-1.5 flex items-center gap-2 px-1">
            <span className="text-[10.5px] font-semibold text-ink-soft">
              {active.length} filter{active.length === 1 ? "" : "s"} on
            </span>
            <button
              type="button"
              onClick={() => setActive([])}
              className="press inline-flex items-center gap-1 rounded-full bg-cream-deep px-2 py-0.5 text-[10.5px] font-bold text-ink hover:bg-rose-soft hover:text-clay"
            >
              <CloseIcon className="h-2.5 w-2.5" /> Clear
            </button>
          </div>
        ) : null}
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-2xl">🫙</div>
          <h3 className="mt-3 font-display text-xl font-semibold">Nothing quite matches</h3>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-soft">{emptyMessage}</p>
          <button
            type="button"
            onClick={() => {
              setActive([]);
              setSort("popular");
            }}
            className="press mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[12px] font-bold text-cream"
          >
            <SparkleIcon className="h-3.5 w-3.5 text-lime" /> Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
