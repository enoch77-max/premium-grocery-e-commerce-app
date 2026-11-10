"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { discountPercent, formatMoney } from "@/lib/format";
import { CheckIcon, LeafIcon, SparkleIcon } from "@/components/icons";

const views = [
  { id: "pack", label: "Pack shot", scale: 1, position: "center" },
  { id: "close", label: "Close-up", scale: 1.55, position: "center" },
  { id: "detail", label: "Texture", scale: 1.3, position: "35% 30%" },
];

export function ProductGallery({ product, categoryName }: { product: Product; categoryName: string }) {
  const [active, setActive] = useState(0);
  const view = views[active];
  const discount = discountPercent(product.priceCents, product.compareAtCents);

  return (
    <div>
      <div className="relative overflow-hidden rounded-[22px] border border-line/80 bg-white sm:rounded-[26px]">
        {/* A full square photo pushed the title and price ~750px down a phone
            screen. Phones get a 4:3 hero capped to 38% of the viewport. */}
        <div className="gallery-frame relative aspect-[4/3] max-h-[38dvh] w-full overflow-hidden bg-cream sm:aspect-square sm:max-h-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 ease-out"
            style={{ transform: `scale(${view.scale})`, objectPosition: view.position }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent" />

          {/* One flex row so the left badges and the right chip can never
              overlap on narrow screens; each capsule keeps its text on one line. */}
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              {discount > 0 ? (
                <span className="whitespace-nowrap rounded-full bg-clay px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-white shadow-sm">
                  SAVE {discount}%
                </span>
              ) : null}
              {product.badge && !product.badge.toLowerCase().includes("save") ? (
                <span className="max-w-full whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-ink shadow-sm backdrop-blur">
                  {product.badge}
                </span>
              ) : null}
              {/* Origin sits with the other metadata chips so the photo bottom
                  only has to carry a single status line. */}
              <span className="max-w-full whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm backdrop-blur">
                {product.origin}
              </span>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-brand-deep shadow-sm backdrop-blur">
              <LeafIcon className="h-3 w-3" /> Fresh today
            </span>
          </div>

          {/* A single capsule with the whole line intact — no competing width,
              so "ships from …" always reads on one line. */}
          <div className="absolute inset-x-3 bottom-3 flex">
            <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold text-cream backdrop-blur">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              In stock · ships from {categoryName}
            </span>
          </div>
        </div>

        <div className="gallery-strip flex items-center gap-2 border-t border-line/70 p-2 sm:p-2.5">
          {views.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View ${item.label}`}
              className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 bg-cream transition sm:h-14 sm:w-14 sm:rounded-xl ${
                active === index ? "border-brand" : "border-transparent hover:border-line"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                style={{ transform: `scale(${item.scale})`, objectPosition: item.position }}
              />
            </button>
          ))}
          <div className="ml-auto hidden flex-col items-end pr-1 text-right sm:flex">
            <p className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-deep">
              <CheckIcon className="h-3 w-3" /> Freshness guaranteed
            </p>
            <p className="text-[10px] text-ink-soft">Refunded in one tap if not perfect</p>
          </div>
        </div>
      </div>

      <div className="mt-2.5 hidden grid-cols-3 gap-2 sm:grid">
        {[
          { label: "Next slot", value: "6–8pm today" },
          { label: "Delivery", value: "Free over $35" },
          { label: "Usual price", value: product.compareAtCents ? formatMoney(product.compareAtCents) : formatMoney(product.priceCents) },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-line/70 bg-white/70 px-2.5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-soft">{item.label}</p>
            <p className="mt-0.5 text-[11.5px] font-bold text-ink">{item.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 hidden items-center gap-1 text-[10.5px] text-ink-soft sm:inline-flex">
        <SparkleIcon className="h-3 w-3 text-amber" /> Price locked for this basket — no surprise fees at checkout.
      </p>
    </div>
  );
}
