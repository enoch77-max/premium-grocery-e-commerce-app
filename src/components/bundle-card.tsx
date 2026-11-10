"use client";

import Link from "next/link";
import type { Bundle } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { theme } from "@/components/themes";
import { useCart } from "@/components/cart-provider";
import { PlusIcon, SparkleIcon } from "@/components/icons";

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const { addMany, isPending } = useCart();
  const style = theme(bundle.theme);
  const products = bundle.products ?? [];
  const pending = products.some((product) => isPending(product.id));

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-line/80 bg-white transition hover:-translate-y-1 hover:shadow-lift">
      <div className={`relative ${style.panel} px-4 pb-3 pt-4`}>
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full bg-white/20 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] backdrop-blur">
            <SparkleIcon className="h-2.5 w-2.5" /> {bundle.badge}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-black/15 px-2 py-0.5 text-[9.5px] font-bold">
            {products.length} items
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bundle.imageUrl} alt={bundle.title} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-[19px] font-semibold leading-tight tracking-tight">{bundle.title}</h3>
            <p className="line-clamp-2 text-[11px] leading-snug opacity-80">{bundle.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-center gap-1">
          {products.slice(0, 5).map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line bg-cream transition hover:-translate-y-0.5"
              title={product.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
            </Link>
          ))}
          <span className="ml-1 text-[10px] font-medium leading-tight text-ink-soft">
            Everything you need,
            <br /> one tap
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-extrabold tracking-tight text-ink">{formatMoney(bundle.priceCents)}</span>
              <span className="text-[11.5px] text-ink-soft line-through">{formatMoney(bundle.compareAtCents)}</span>
            </div>
            <p className="text-[10.5px] font-bold text-brand">
              Save {formatMoney(bundle.compareAtCents - bundle.priceCents)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => addMany(products.map((product) => ({ productId: product.id, quantity: 1 })), bundle.title)}
          disabled={pending || !products.length}
          className="press mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-ink text-[12px] font-bold text-cream hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream border-t-transparent" />
          ) : (
            <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
          )}
          Add all {products.length} to basket
        </button>
      </div>
    </article>
  );
}
