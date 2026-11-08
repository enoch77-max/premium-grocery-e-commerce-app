"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { CheckIcon, PlusIcon, SparkleIcon } from "@/components/icons";

export function FrequentlyBought({ product, companions }: { product: Product; companions: Product[] }) {
  const { addMany, isPending } = useCart();
  const [selected, setSelected] = useState<number[]>(companions.map((item) => item.id));

  const chosen = companions.filter((item) => selected.includes(item.id));
  const total = [product, ...chosen].reduce((sum, item) => sum + item.priceCents, 0);
  const compareTotal = [product, ...chosen].reduce(
    (sum, item) => sum + (item.compareAtCents ?? item.priceCents),
    0,
  );
  const savings = compareTotal - total;
  const pending = [product, ...chosen].some((item) => isPending(item.id));

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <section id="frequently-bought" className="scroll-mt-32 rounded-[24px] border border-line/80 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">
            <SparkleIcon className="h-3 w-3" /> Complete the plate
          </p>
          <h2 className="mt-1 font-display text-[21px] font-semibold leading-tight tracking-tight">
            Frequently bought together
          </h2>
        </div>
        {savings > 0 ? (
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-extrabold text-brand-deep">
            Save {formatMoney(savings)} vs usual prices
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <div className="aspect-square overflow-hidden rounded-xl border border-line/70 bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            </div>
            <p className="mt-1 line-clamp-1 text-[10.5px] font-bold text-ink">{product.name}</p>
            <p className="text-[10px] font-semibold text-brand-deep">{formatMoney(product.priceCents)}</p>
            <span className="absolute -right-1 top-1 rounded-full bg-ink px-1.5 py-0.5 text-[8.5px] font-extrabold text-lime">
              THIS ITEM
            </span>
          </div>

          {companions.map((item) => {
            const isOn = selected.includes(item.id);
            return (
              <div key={item.id} className="relative flex min-w-0 flex-1 items-center gap-2">
                <span className="text-[15px] font-bold text-ink-soft">+</span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`relative block w-full overflow-hidden rounded-xl border-2 bg-cream transition ${
                      isOn ? "border-brand" : "border-line/70 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span className="block aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    </span>
                    <span
                      className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full ${
                        isOn ? "bg-brand text-white" : "border border-ink/20 bg-white text-transparent"
                      }`}
                    >
                      <CheckIcon className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </button>
                  <Link href={`/product/${item.slug}`} className="mt-1 block line-clamp-1 text-[10.5px] font-bold text-ink hover:text-brand">
                    {item.name}
                  </Link>
                  <p className="text-[10px] font-semibold text-brand-deep">{formatMoney(item.priceCents)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-cream/70 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
            {chosen.length + 1} items · total
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-[25px] font-semibold leading-none tracking-tight">{formatMoney(total)}</span>
            {savings > 0 ? (
              <span className="text-[11px] text-ink-soft line-through">{formatMoney(compareTotal)}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() =>
              addMany(
                [product, ...chosen].map((item) => ({ productId: item.id, quantity: 1 })),
                `${chosen.length + 1} items added`,
              )
            }
            disabled={pending}
            className="press mt-2.5 flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand text-[12px] font-bold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {pending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            Add all {chosen.length + 1} to basket
          </button>
          <p className="mt-1.5 text-center text-[9.5px] text-ink-soft">One tap · no need to hunt for the extras</p>
        </div>
      </div>
    </section>
  );
}
