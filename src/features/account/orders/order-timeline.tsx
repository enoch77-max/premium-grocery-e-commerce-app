"use client";

import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/lib/order-types";
import { CheckIcon } from "@/components/icons";

/** Four-step fulfilment rail for a single order. */
export function OrderTimeline({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-1.5">
      {ORDER_STATUS_FLOW.map((step, index) => {
        const done = index <= activeIndex;
        const current = index === activeIndex;
        return (
          <div
            key={step}
            className={`rounded-xl border px-2.5 py-2 ${
              current
                ? "border-brand bg-brand-soft/50"
                : done
                  ? "border-brand/30 bg-cream/60"
                  : "border-line bg-white"
            }`}
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[9px] font-extrabold ${
                done ? "bg-brand text-white" : "border border-line text-ink-soft"
              }`}
            >
              {done ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : index + 1}
            </span>
            <p className={`mt-1 text-[11px] font-bold ${done ? "text-ink" : "text-ink-soft"}`}>
              {ORDER_STATUS_LABELS[step].label}
            </p>
            <p className="text-[9.5px] leading-snug text-ink-soft">{ORDER_STATUS_LABELS[step].note}</p>
          </div>
        );
      })}
    </div>
  );
}
