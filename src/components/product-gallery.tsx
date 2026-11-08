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
      <div className="relative overflow-hidden rounded-[26px] border border-line/80 bg-white">
        <div className="relative aspect-square w-full overflow-hidden bg-cream">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 ease-out"
            style={{ transform: `scale(${view.scale})`, objectPosition: view.position }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {discount > 0 ? (
              <span className="rounded-full bg-clay px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-white shadow-sm">
                SAVE {discount}%
              </span>
            ) : null}
            {product.badge ? (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-ink shadow-sm backdrop-blur">
                {product.badge}
              </span>
            ) : null}
          </div>

          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-brand-deep shadow-sm backdrop-blur">
            <LeafIcon className="h-3 w-3" /> Fresh today
          </span>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold text-cream backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" /> In stock · ships from {categoryName}
            </span>
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm">
              {product.origin}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line/70 p-2.5">
          {views.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View ${item.label}`}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-cream transition ${
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
          <div className="ml-auto flex flex-col items-end pr-1 text-right">
            <p className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-deep">
              <CheckIcon className="h-3 w-3" /> Freshness guaranteed
            </p>
            <p className="text-[10px] text-ink-soft">Refunded in one tap if not perfect</p>
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
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
      <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-ink-soft">
        <SparkleIcon className="h-3 w-3 text-amber" /> Price locked for this basket — no surprise fees at checkout.
      </p>
    </div>
  );
}
