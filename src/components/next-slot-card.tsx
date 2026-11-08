"use client";

import Link from "next/link";
import { useDelivery } from "@/components/delivery-provider";
import { ClockIcon } from "@/components/icons";

export function NextSlotCard() {
  const { area, openPicker } = useDelivery();
  const nextSlot = area.slots.find((slot) => slot.toLowerCase().startsWith("today")) ?? area.slots[0];

  return (
    <div className="rounded-2xl border border-line/80 bg-white p-3.5">
      <div className="flex items-center gap-1.5">
        <ClockIcon className="h-4 w-4 text-brand" />
        <p className="text-[11px] font-bold text-ink">Next slot: {nextSlot.replace("Today ", "")}</p>
      </div>
      <p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">
        Delivering to {area.neighbourhood} ({area.postcode}) in {area.eta}. Free over $35.
      </p>
      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          onClick={openPicker}
          className="press flex h-8 flex-1 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-cream hover:bg-brand-deep"
        >
          Set delivery area
        </button>
        <Link
          href="/offers#delivery"
          className="press flex h-8 items-center justify-center rounded-lg border border-line px-2.5 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
        >
          Slots
        </Link>
      </div>
    </div>
  );
}
