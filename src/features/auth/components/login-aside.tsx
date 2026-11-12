"use client";

import { CheckIcon, LeafIcon, SparkleIcon, TruckIcon } from "@/components/icons";
import { useCart } from "@/components/cart-provider";

/** Right-hand marketing column on the sign-in screen. Pure presentation. */
export function LoginAside() {
  const { cart } = useCart();
  return (
        <div className="space-y-3">
          <div className="rounded-[26px] bg-[#13261d] p-5 text-cream sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-lime">
              Why create an account
            </p>
            <div className="mt-3 space-y-3">
              {[
                { title: "Basket follows you", note: "Add on your phone, finish on your laptop." },
                { title: "One-tap reorder", note: "Repeat last week's shop in a single tap." },
                { title: "Saved addresses", note: "Switch between home, work and a neighbour." },
                { title: "Full order history", note: "Track, cancel or reorder — receipts kept safe." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-brand-deep">
                    <CheckIcon className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-[12px] font-bold">{item.title}</p>
                    <p className="text-[10.5px] text-cream/70">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
            {cart?.itemCount ? (
              <div className="mt-4 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-lime">
                  <SparkleIcon className="h-3 w-3" /> Your basket travels with you
                </p>
                <p className="text-[10.5px] text-cream/70">
                  {cart?.itemCount ?? 0} item{(cart?.itemCount ?? 0) === 1 ? "" : "s"} (
                  {cart?.subtotalCents ? `$${(cart.subtotalCents / 100).toFixed(2)}` : ""}) will be waiting
                  after you sign in.
                </p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2 text-[10.5px] text-cream/60">
              <span className="inline-flex items-center gap-1">
                <TruckIcon className="h-3.5 w-3.5" /> 30-minute slots
              </span>
              <span className="inline-flex items-center gap-1">
                <LeafIcon className="h-3.5 w-3.5" /> Freshness guarantee
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-line/80 bg-white p-4">
            <p className="text-[11px] font-bold text-ink">Guest checkout is always available</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-soft">
              No account required to order. If you register later with the same email, past guest orders
              appear in your history automatically.
            </p>
          </div>
        </div>
  );
}
