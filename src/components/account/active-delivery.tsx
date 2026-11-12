"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AccountOrder } from "@/components/account/data";
import { useCart } from "@/components/cart-provider";
import { useSession } from "@/components/session-provider";
import { formatDeliverySlot, formatMoney, plural } from "@/lib/format";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, normaliseOrderStatus } from "@/lib/order-types";
import { ArrowRightIcon, CheckIcon, ClockIcon, RefreshIcon, TruckIcon } from "@/components/icons";

const STEPS = ["Ordered", "Packing", "On the way", "Delivered"];

/**
 * The delivery the shopper is actually waiting for. Reads like an order tracker
 * rather than a table: hero copy, progress, thumbnail strip, and the two things
 * people tap from here — track, or add the same basket again.
 */
export function ActiveDelivery({ order }: { order: AccountOrder }) {
  const { refresh: refreshCart } = useCart();
  const { authFetch } = useSession();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const status = normaliseOrderStatus(order.status);
  const meta = ORDER_STATUS_LABELS[status] ?? ORDER_STATUS_LABELS.confirmed;
  const index = Math.max(0, ORDER_STATUS_FLOW.indexOf(status as (typeof ORDER_STATUS_FLOW)[number]));
  const progress = ((index + 1) / STEPS.length) * 100;
  const remaining = Math.max(0, STEPS.length - index - 1);

  const thumbnails = useMemo(() => order.items.slice(0, 4), [order.items]);

  return (
    <section className="overflow-hidden rounded-3xl border border-line/80 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">
            <TruckIcon className="h-3.5 w-3.5" />
            {status === "delivered" ? "Last delivery" : "On its way"}
          </p>
          <h2 className="mt-1 font-display text-[24px] font-semibold leading-tight tracking-tight">
            {status === "delivered" ? "Delivered — enjoy it!" : meta.label}
          </h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            {order.deliverySlot ? `Slot ${formatDeliverySlot(order.deliverySlot)}` : meta.note} · {order.city}{" "}
            {order.postcode}
          </p>
        </div>
        <Link
          href={`/account/orders/${order.orderNumber}`}
          className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand"
        >
          Track order <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>

      {/* progress rail */}
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center gap-1.5">
          {STEPS.map((step, stepIndex) => (
            <div key={step} className="flex-1">
              <div className={`h-1.5 rounded-full ${stepIndex <= index ? "bg-brand" : "bg-cream-deep"}`} />
              <p
                className={`mt-1 text-[9.5px] font-semibold ${stepIndex <= index ? "text-brand-deep" : "text-ink-soft/60"}`}
              >
                {step}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-ink-soft">
          <ClockIcon className="h-3 w-3 text-brand" />
          {remaining > 0
            ? `${remaining} step${remaining === 1 ? "" : "s"} to go — we'll text you as it moves`
            : "Complete — refunded instantly if anything wasn't perfect"}
        </p>
        <div className="sr-only" aria-hidden>
          {progress}%
        </div>
      </div>

      <div className="border-t border-line/70 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex -space-x-2">
            {thumbnails.map((item) => (
              <span
                key={item.id}
                className="relative block h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-cream shadow-soft"
              >
<Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="44px"
                  className="h-full w-full object-cover"
                />
              </span>
            ))}
            {order.items.length > thumbnails.length ? (
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-cream-deep text-[10px] font-bold text-ink">
                +{order.items.length - thumbnails.length}
              </span>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-ink-soft">{plural(order.itemCount, "item")}</p>
            <p className="text-[15px] font-extrabold tracking-tight text-ink">
              {formatMoney(order.totalCents)}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNote(null);
            try {
              // Server-side reorder: resolves live products, stock and slugs.
              const response = await authFetch(`/api/orders/${order.orderNumber}/reorder`, {
                method: "POST",
              });
              const data = (await response.json().catch(() => null)) as {
                error?: string;
                cartToken?: string;
                unavailable?: string[];
              } | null;
              if (!response.ok) throw new Error(data?.error ?? "We couldn't add those items");
              if (data?.cartToken) window.localStorage.setItem("fresco:cart-token", data.cartToken);
              await refreshCart();
              setDone(true);
              setNote(
                data?.unavailable?.length
                  ? `Added, except: ${data.unavailable.slice(0, 2).join(", ")} (out of stock)`
                  : "Every item is back in your basket",
              );
              window.setTimeout(() => setDone(false), 5000);
            } catch (error) {
              setNote(error instanceof Error ? error.message : "We couldn't add those items");
            } finally {
              setBusy(false);
            }
          }}
          className="press mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-center text-[13px] font-bold text-cream hover:bg-brand-deep disabled:opacity-60"
        >
          {done ? (
            <CheckIcon className="h-4 w-4 text-lime" />
          ) : (
            <RefreshIcon className="h-4 w-4" strokeWidth={2.2} />
          )}
          {done ? "Added to your basket" : "Add these items again"}
        </button>
        {note ? <p className="mt-2 text-center text-[11px] font-semibold text-brand-deep">{note}</p> : null}
      </div>
    </section>
  );
}
