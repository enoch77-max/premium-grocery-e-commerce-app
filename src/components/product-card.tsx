"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent, formatMoney } from "@/lib/format";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useSaved } from "@/components/saved-provider";
import { CartControls } from "@/components/cart-controls";
import { HeartIcon, PlusIcon, StarIcon } from "@/components/icons";
import { SignalStack } from "@/components/product-signals";

export function ProductCard({ product, className = "" }: { product: Product; className?: string }) {
  const { add, isPending } = useCart();
  const { isSaved, toggle } = useSaved();
  const [savedBusy, setSavedBusy] = useState(false);
  const saved = isSaved(product.slug);
  const discount = discountPercent(product.priceCents, product.compareAtCents);
  const pending = isPending(product.id);

  const toggleSaved = async () => {
    setSavedBusy(true);
    try {
      const result = await toggle(product.slug);
      if (result.requiresAuth) {
        window.location.href = `/login?next=${encodeURIComponent(`/product/${product.slug}`)}`;
      }
    } finally {
      setSavedBusy(false);
    }
  };

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[20px] border border-line/80 bg-white transition duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-lift ${className}`}
    >
      <div className="relative overflow-hidden bg-cream">
        <div className="shine relative aspect-square w-full overflow-hidden">
          <Link href={`/product/${product.slug}`} className="block h-full w-full" aria-label={product.name}>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
              className="object-cover transition duration-[600ms] ease-out group-hover:scale-[1.05]"
            />
          </Link>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/5 to-transparent" />
        </div>

        {/* discount first, then the icon-first signal chips — the whole story
            of this product in two glances, zero paragraphs */}
        <div>
          <SignalStack
            product={product}
            leading={
              discount > 0 ? (
                <span className="rounded-full bg-clay px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-white shadow-sm">
                  −{discount}%
                </span>
              ) : null
            }
          />
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void toggleSaved();
          }}
          disabled={savedBusy}
          aria-label={saved ? `Remove ${product.name} from saved items` : `Save ${product.name} for later`}
          aria-pressed={saved}
          className={`press absolute bottom-2 left-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-soft backdrop-blur transition hover:text-clay disabled:opacity-60 ${
            saved ? "text-clay" : "text-ink-soft"
          }`}
        >
          <HeartIcon filled={saved} className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void add(product);
          }}
          disabled={pending}
          aria-label={`Quick add ${product.name}`}
          // Hover-only affordances are invisible to a thumb, so on touch screens
          // the quick-add button is always on.
          className="press absolute bottom-2.5 right-2.5 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-brand-deep opacity-100 shadow-soft backdrop-blur transition duration-200 hover:bg-brand hover:text-white disabled:opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 sm:h-9 sm:w-9"
        >
          <PlusIcon className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft/80">
            {product.brand}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-cream px-1.5 py-0.5 text-[10px] font-bold text-ink">
            <StarIcon className="h-2.5 w-2.5 text-amber" />
            {product.rating.toFixed(1)}
            <span className="font-medium text-ink-soft">({product.reviewCount})</span>
          </span>
        </div>

        <Link href={`/product/${product.slug}`} className="mt-1 block">
          <h3 className="line-clamp-2 min-h-[32px] text-[13px] font-bold leading-snug text-ink group-hover:text-brand-deep">
            {product.name}
          </h3>
        </Link>
        <p className="mt-0.5 truncate text-[11px] text-ink-soft">{product.unit}</p>

        <div className="mt-2 flex items-end justify-between gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-extrabold tracking-tight text-ink">
              {formatMoney(product.priceCents)}
            </span>
            {product.compareAtCents ? (
              <span className="text-[11px] font-medium text-ink-soft line-through">
                {formatMoney(product.compareAtCents)}
              </span>
            ) : null}
          </div>
          {product.stock <= 25 ? (
            <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide text-clay">
              {product.stock} left
            </span>
          ) : null}
        </div>

        <div className="mt-2.5">
          <CartControls product={product} />
        </div>
      </div>
    </article>
  );
}
