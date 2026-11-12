"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { discountPercent, formatMoney } from "@/lib/format";
import { SignalStack } from "@/components/product-signals";
import { CheckIcon } from "@/components/icons";

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
          {/* LCP element on this page: priority + explicit responsive sizes. */}
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 560px"
            className="object-cover transition duration-500 ease-out"
            style={{ transform: `scale(${view.scale})`, objectPosition: view.position }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-transparent" />

          {/* Two items only: discount top-left, one quiet signal top-right.
              No seal, no glow, no floating leaves — the produce is the hero. */}
          <SignalStack
            product={product}
            leading={
              discount > 0 ? (
                <span className="whitespace-nowrap rounded-full bg-clay px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white shadow-sm">
                  SAVE {discount}%
                </span>
              ) : null
            }
          />

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
              <span className="absolute inset-0 overflow-hidden rounded-[6px]">
                <Image
                  src={product.imageUrl}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                  style={{ objectPosition: item.position }}
                />
              </span>
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
    </div>
  );
}
