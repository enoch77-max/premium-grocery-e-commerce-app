"use client";

import Image from "next/image";
import { formatMoney, plural } from "@/lib/format";
import type { CartState } from "@/lib/types";
import { ArrowRightIcon, CheckIcon, LeafIcon, ShieldIcon, TruckIcon } from "@/components/icons";

/** Sticky order summary: lines, coupon, totals, free-delivery progress. */
export function OrderSummary({
  cart,
  submitting,
  staleBasket,
  couponInput,
  couponMessage,
  onCouponInput,
  onApplyCoupon,
  onRemoveCoupon,
  onSubmit,
}: {
  cart: CartState;
  submitting: boolean;
  staleBasket: boolean;
  couponInput: string;
  couponMessage: string | null;
  onCouponInput: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  onSubmit: () => void;
}) {
  void staleBasket;
  void couponMessage;
  void onCouponInput;
  void onApplyCoupon;
  void onRemoveCoupon;
  const progress = Math.min(
    100,
    Math.round(
      ((cart.freeDeliveryThresholdCents - cart.freeDeliveryRemainingCents) /
        cart.freeDeliveryThresholdCents) *
        100,
    ),
  );

  return (
    <aside className="space-y-3 lg:sticky lg:top-[150px]">
      <div className="rounded-[24px] border border-line/80 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold tracking-tight">Order summary</h2>
          <span className="text-[10.5px] font-semibold text-ink-soft">{plural(cart.itemCount, "item")}</span>
        </div>
        <div className="mt-2 max-h-[240px] space-y-2 overflow-y-auto pr-1">
          {cart.lines.map((line) => (
            <div key={line.id} className="flex items-center gap-2.5">
              <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line/70 bg-cream">
<Image
                  src={line.imageUrl}
                  alt=""
                  fill
                  sizes="44px"
                  className="h-full w-full object-cover"
                />
                <span className="absolute right-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-ink text-[9px] font-bold text-cream">
                  {line.quantity}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-bold text-ink">{line.name}</p>
                <p className="truncate text-[9.5px] text-ink-soft">{line.unit}</p>
              </div>
              <span className="text-[11.5px] font-bold text-ink">{formatMoney(line.lineTotalCents)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 space-y-1 text-[11.5px]">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="font-semibold text-ink">{formatMoney(cart.subtotalCents)}</span>
          </div>
          {cart.savingsCents > 0 ? (
            <div className="flex justify-between text-brand">
              <span>Savings</span>
              <span className="font-semibold">−{formatMoney(cart.savingsCents)}</span>
            </div>
          ) : null}
          {cart.coupon ? (
            <div className="flex justify-between text-brand">
              <span>{cart.coupon.code}</span>
              <span className="font-semibold">−{formatMoney(cart.discountCents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-ink-soft">
            <span>Delivery</span>
            <span
              className={cart.deliveryCents === 0 ? "font-semibold text-brand" : "font-semibold text-ink"}
            >
              {cart.deliveryCents === 0 ? "Free" : formatMoney(cart.deliveryCents)}
            </span>
          </div>
        </div>
        <div className="mt-2.5 flex items-end justify-between border-t border-dashed border-line pt-2.5">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-soft">Total</p>
            <p className="font-display text-[24px] font-semibold leading-none tracking-tight">
              {formatMoney(cart.totalCents)}
            </p>
          </div>
          {cart.savingsCents + cart.discountCents > 0 ? (
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-bold text-brand-deep">
              You save {formatMoney(cart.savingsCents + cart.discountCents)}
            </span>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={submitting}
          onClick={onSubmit}
          className="press mt-2.5 hidden h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-[13.5px] font-bold text-white hover:bg-brand-deep disabled:opacity-70 lg:flex"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Placing your order…
            </>
          ) : (
            <>
              Place order · {formatMoney(cart.totalCents)}
              <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-[9.5px] text-ink-soft">
          <ShieldIcon className="h-3 w-3" /> Encrypted & contactless
        </p>
      </div>

      <div className="rounded-2xl border border-line/80 bg-cream/60 p-3.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-brand">
            <TruckIcon className="h-4 w-4" />
          </span>
          <p className="text-[11px] font-bold text-ink">
            {cart.freeDeliveryRemainingCents > 0
              ? `${formatMoney(cart.freeDeliveryRemainingCents)} away from free delivery`
              : "Free delivery unlocked"}
          </p>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-soft">
          <LeafIcon className="h-3 w-3 text-brand" /> Freshness guaranteed, always.
        </p>
      </div>
    </aside>
  );
}
