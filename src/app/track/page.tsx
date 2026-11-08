import type { Metadata } from "next";
import { TrackOrder } from "@/components/track-order";

export const metadata: Metadata = {
  title: "Track your order — Fresco",
  description: "Check the live status of your Fresco delivery with your order number and email.",
};

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Order tracking</p>
      <h1 className="mt-1.5 font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] sm:text-[38px]">
        Where&apos;s my order?
      </h1>
      <p className="mt-2 max-w-lg text-[12.5px] leading-relaxed text-ink-soft">
        Enter the order number from your confirmation (it starts with FR-) and the email you used at checkout. No account
        needed.
      </p>
      <div className="mt-5">
        <TrackOrder />
      </div>
    </div>
  );
}
