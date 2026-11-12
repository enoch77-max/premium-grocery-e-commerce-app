"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAccountOrders } from "@/components/account/data";
import { OrderTimeline } from "@/features/account/orders/order-timeline";
import { OrderItemsCard } from "@/features/account/orders/order-items-card";
import { useSession } from "@/components/session-provider";
import { useCart } from "@/components/cart-provider";
import { formatDeliverySlot, formatMoney, plural } from "@/lib/format";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, normaliseOrderStatus, orderStatusIndex } from "@/lib/order-types";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  LeafIcon,
  PinIcon,
  ClockIcon,
  MoonIcon,
  RefreshIcon,
  ShieldIcon,
  SunIcon,
  TruckIcon,
} from "@/components/icons";

export function OrderDetail() {
  const params = useParams<{ number: string }>();
  const router = useRouter();
  const { orders, loading, reload } = useAccountOrders();
  const { authFetch } = useSession();
  const { openCart, refresh: refreshCart } = useCart();
  const [busy, setBusy] = useState<"reorder" | "cancel" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const order = orders.find((item) => item.orderNumber === params.number);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="shimmer h-32 rounded-2xl" />
        <div className="shimmer h-56 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-2xl">
          📦
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold">We can&apos;t find that order</h2>
        <p className="mx-auto mt-1 max-w-sm text-[12px] text-ink-soft">
          Order {params.number} isn&apos;t linked to your account. If you ordered as a guest, register with
          the same email and it will appear automatically.
        </p>
        <Link
          href="/account/orders"
          className="press mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-bold text-white"
        >
          Back to orders <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const status = ORDER_STATUS_LABELS[order.status] ?? ORDER_STATUS_LABELS.confirmed;
  const activeIndex = orderStatusIndex(order.status);
  const cancellable = order.status === "confirmed" || order.status === "packing";

  const reorder = async () => {
    setBusy("reorder");
    setMessage(null);
    try {
      const response = await authFetch(`/api/orders/${order.orderNumber}/reorder`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        added?: number;
        unavailable?: string[];
      } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "We couldn't reorder this basket.");
        return;
      }
      setMessage(
        data?.unavailable?.length
          ? `${data.added} items added. Unavailable: ${data.unavailable.join(", ")}.`
          : `${data?.added ?? 0} items added to your basket.`,
      );
      await refreshCart();
      openCart();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    setMessage(null);
    try {
      const response = await authFetch(`/api/orders/${order.orderNumber}/cancel`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "We couldn't cancel that order.");
        return;
      }
      setMessage("Order cancelled — your refund is on its way.");
      setConfirmCancel(false);
      await reload();
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-line/80 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand">
              {order.orderNumber}
            </p>
            <h2 className="mt-0.5 font-display text-[24px] font-semibold leading-tight tracking-tight">
              {formatMoney(order.totalCents)}{" "}
              <span className="text-[13px] font-medium text-ink-soft">
                · {plural(order.itemCount, "item")} ·{" "}
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              Delivery slot:{" "}
              <span className="font-semibold text-ink">{formatDeliverySlot(order.deliverySlot)}</span> ·
              Payment: {order.paymentMethod === "cash" ? "cash on delivery" : order.paymentMethod}
            </p>
          </div>
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${
              order.status === "cancelled"
                ? "bg-rose-soft text-clay"
                : order.status === "delivered"
                  ? "bg-brand-soft text-brand-deep"
                  : "bg-amber-soft text-ink"
            }`}
          >
            {status.label}
          </span>
        </div>

        {order.status !== "cancelled" ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <OrderTimeline activeIndex={activeIndex} />
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-rose-soft px-3 py-2 text-[11px] font-semibold text-clay">
            This order was cancelled
            {order.cancelledAt
              ? ` on ${new Date(order.cancelledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : ""}
            . Any charge is refunded to the original payment method within one working day.
          </p>
        )}

        {message ? (
          <p className="mt-2 rounded-xl bg-brand-soft/70 px-3 py-2 text-[11px] font-semibold text-brand-deep">
            {message}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void reorder()}
            disabled={busy === "reorder"}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[11.5px] font-bold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {busy === "reorder" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <RefreshIcon className="h-3.5 w-3.5" />
            )}
            Reorder these items
          </button>
          <Link
            href={`/order/${order.orderNumber}`}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand"
          >
            Receipt & tracking <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
          {cancellable ? (
            confirmCancel ? (
              <span className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void cancel()}
                  disabled={busy === "cancel"}
                  className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-clay px-3.5 text-[11.5px] font-bold text-white disabled:opacity-60"
                >
                  <CloseIcon className="h-3.5 w-3.5" /> Yes, cancel order
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="press inline-flex h-9 items-center rounded-full border border-line px-3 text-[11.5px] font-bold text-ink"
                >
                  Keep it
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[11.5px] font-bold text-ink-soft hover:border-clay hover:text-clay"
              >
                Cancel order
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-line/80 bg-white p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">Items</h3>
          <OrderItemsCard items={order.items} />
          <div className="mt-2 space-y-1 border-t border-line/70 pt-2 text-[11.5px]">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span className="font-semibold text-ink">{formatMoney(order.subtotalCents)}</span>
            </div>
            {order.discountCents > 0 ? (
              <div className="flex justify-between text-brand">
                <span>{order.couponCode ?? "Coupon"}</span>
                <span className="font-semibold">−{formatMoney(order.discountCents)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-ink-soft">
              <span>Delivery</span>
              <span
                className={order.deliveryCents === 0 ? "font-semibold text-brand" : "font-semibold text-ink"}
              >
                {order.deliveryCents === 0 ? "Free" : formatMoney(order.deliveryCents)}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-dashed border-line pt-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Total</span>
              <span className="font-display text-[20px] font-semibold leading-none">
                {formatMoney(order.totalCents)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-line/80 bg-white p-4">
            <h3 className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
              <PinIcon className="h-3.5 w-3.5 text-brand" /> Delivery details
            </h3>
            <p className="mt-1.5 text-[12px] font-bold text-ink">{order.customerName}</p>
            <p className="text-[11px] leading-relaxed text-ink-soft">
              {order.address}, {order.city} {order.postcode}
            </p>
            {order.phone ? <p className="text-[11px] text-ink-soft">{order.phone}</p> : null}
            {order.notes ? (
              <p className="mt-1 rounded-lg bg-cream px-2 py-1 text-[10.5px] italic text-ink-soft">
                “{order.notes}”
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-ink">
              <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5">
                <ClockIcon className="h-3 w-3 text-brand" /> {order.deliverySlot}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5">
                <ShieldIcon className="h-3 w-3 text-brand" />{" "}
                {order.paymentMethod === "cash" ? "Pay on delivery" : "Paid by card"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-line/80 bg-cream/60 p-4">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand">
              <LeafIcon className="h-3.5 w-3.5" /> Something not fresh?
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              Reply to the receipt email within 48 hours of delivery and we refund the item without asking for
              photos.
            </p>
            <Link
              href="/info/contact"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
            >
              Contact support <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-line/80 bg-white p-4">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
              <TruckIcon className="h-3.5 w-3.5 text-brand" /> Need it again?
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              Reordering adds the exact same items (current prices) to your basket in one tap.
            </p>
            <button
              type="button"
              onClick={() => void reorder()}
              disabled={busy === "reorder"}
              className="press mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[11.5px] font-bold text-cream hover:bg-brand-deep disabled:opacity-60"
            >
              <RefreshIcon className="h-3.5 w-3.5" /> Add these items again
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
