"use client";

import Link from "next/link";
import type { Bundle } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { ArrowRightIcon, CheckIcon, PlusIcon, SparkleIcon } from "@/components/icons";

export function SavingsLadder({ bundle }: { bundle?: Bundle }) {
  const { cart, addMany, isPending } = useCart();
  const subtotal = cart?.subtotalCents ?? 0;
  const tiers = [
    { at: 3500, label: "Free delivery", note: "$3.99 back in your pocket" },
    { at: 6000, label: "FRESH10 unlocks", note: "$10 off with code FRESH10" },
    { at: 9000, label: "Best basket value", note: "Stack SAVE15 for 15% off" },
  ];

  const pending = bundle?.products?.some((product) => isPending(product.id)) ?? false;

  return (
    <section className="relative overflow-hidden rounded-[26px] bg-[#13261d] p-5 text-cream sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-lime/20 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-lime">
            <SparkleIcon className="h-3 w-3" /> Basket rewards
          </span>
          <h2 className="mt-3 font-display text-[26px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[34px]">
            The fuller your basket,
            <br className="hidden sm:block" /> the better the deal.
          </h2>
          <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-cream/70">
            Stack free delivery, coupon savings and multi-buys. No membership fee — the discounts simply appear in your
            basket.
          </p>

          <div className="mt-5 space-y-2">
            {tiers.map((tier) => {
              const unlocked = subtotal >= tier.at;
              const progress = Math.min(100, Math.round((subtotal / tier.at) * 100));
              return (
                <div
                  key={tier.at}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                    unlocked ? "border-lime/40 bg-lime/10" : "border-white/12 bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      unlocked ? "bg-lime text-brand-deep" : "border border-white/25 text-[10px] font-bold text-cream/70"
                    }`}
                  >
                    {unlocked ? <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} /> : formatMoney(tier.at, false)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[12px] font-bold ${unlocked ? "text-lime" : "text-cream"}`}>{tier.label}</p>
                      <p className="text-[10px] font-medium text-cream/55">
                        {unlocked ? "Unlocked" : `${formatMoney(tier.at - subtotal)} to go`}
                      </p>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-lime/80" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-0.5 text-[10px] text-cream/55">{tier.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cream/60">Best-seller bundle</p>
          {bundle ? (
            <>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bundle.imageUrl} alt={bundle.title} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-[17px] font-semibold leading-tight">{bundle.title}</p>
                  <p className="text-[10.5px] text-cream/60">
                    {bundle.products?.length ?? 0} items · save {formatMoney(bundle.compareAtCents - bundle.priceCents)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[22px] font-extrabold tracking-tight">{formatMoney(bundle.priceCents)}</span>
                <span className="text-[12px] text-cream/45 line-through">{formatMoney(bundle.compareAtCents)}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  addMany(
                    (bundle.products ?? []).map((product) => ({ productId: product.id, quantity: 1 })),
                    bundle.title,
                  )
                }
                disabled={pending}
                className="press mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-lime text-[12.5px] font-bold text-brand-deep hover:bg-white disabled:opacity-60"
              >
                {pending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-deep border-t-transparent" />
                ) : (
                  <PlusIcon className="h-4 w-4" strokeWidth={2.4} />
                )}
                Add the whole bundle
              </button>
              <Link
                href="/offers#bundles"
                className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-cream/70 hover:text-lime"
              >
                Browse all bundles <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </>
          ) : null}
          <p className="mt-3 text-center text-[9.5px] leading-relaxed text-cream/40">
            Never pay for plastic bags. Prices include tax.
          </p>
        </div>
      </div>
    </section>
  );
}
