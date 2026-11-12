"use client";

import { useState } from "react";
import type { Coupon } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { CheckIcon, SparkleIcon } from "@/components/icons";
import { useCart } from "@/components/cart-provider";

export function CouponCard({ coupon }: { coupon: Coupon }) {
  const [copied, setCopied] = useState(false);
  const { applyCoupon } = useCart();
  const [message, setMessage] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      setMessage(`Copy manually: ${coupon.code}`);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-brand/40 bg-white p-4">
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-brand-soft/70" />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-brand">
            <SparkleIcon className="h-2.5 w-2.5" />
            {coupon.kind === "delivery"
              ? "Free delivery"
              : coupon.kind === "percent"
                ? `${coupon.percentOff}% off`
                : `${formatMoney(coupon.valueCents ?? 0, false)} off`}
          </p>
          <p className="mt-1 font-display text-[19px] font-semibold leading-tight text-ink">
            {coupon.description}
          </p>
          <p className="mt-0.5 text-[10.5px] text-ink-soft">
            {coupon.minSubtotalCents > 0
              ? `Minimum spend ${formatMoney(coupon.minSubtotalCents)}`
              : "No minimum spend"}
          </p>
        </div>
        <span className="rounded-full bg-lime px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-brand-deep">
          Save
        </span>
      </div>

      <div className="relative mt-3 flex items-center gap-2">
        <span className="flex-1 rounded-lg border border-line bg-cream/70 px-3 py-2 font-mono text-[13px] font-bold tracking-[0.08em] text-ink">
          {coupon.code}
        </span>
        <button
          type="button"
          onClick={copy}
          className="press h-9 rounded-lg bg-ink px-3 text-[11px] font-bold text-cream hover:bg-brand-deep"
        >
          {copied ? (
            <span className="inline-flex items-center gap-1">
              <CheckIcon className="h-3.5 w-3.5" /> Copied
            </span>
          ) : (
            "Copy"
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={async () => {
          const result = await applyCoupon(coupon.code);
          setMessage(result.message);
        }}
        className="mt-2 text-[10.5px] font-bold text-brand hover:underline"
      >
        {message ?? "Apply to my basket →"}
      </button>
    </div>
  );
}
