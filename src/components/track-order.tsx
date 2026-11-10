"use client";

import Link from "next/link";
import { useState } from "react";
import type { OrderItemRecord } from "@/lib/order-types";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, orderStatusIndex } from "@/lib/order-types";
import { formatDeliverySlot, formatMoney, plural } from "@/lib/format";
import { ArrowRightIcon, CheckIcon, ClockIcon, PinIcon, ShieldIcon } from "@/components/icons";

type TrackedOrder = {
  orderNumber: string;
  status: string;
  createdAt: string;
  cancelledAt: string | null;
  totalCents: number;
  itemCount: number;
  deliverySlot: string;
  paymentMethod: string;
  customerName: string;
  address: string;
  city: string;
  postcode: string;
  items: OrderItemRecord[];
};

export function TrackOrder() {
  const [form, setForm] = useState({ orderNumber: "", email: "" });
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => null)) as { order?: TrackedOrder; error?: string } | null;
      if (!response.ok || !data?.order) {
        setError(data?.error ?? "We couldn't find that order.");
        return;
      }
      setOrder(data.order);
    } catch {
      setError("Network hiccup — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const status = order ? (ORDER_STATUS_LABELS[order.status] ?? ORDER_STATUS_LABELS.confirmed) : null;
  const activeIndex = order ? orderStatusIndex(order.status) : 0;

  return (
    <div className="space-y-3">
      <form onSubmit={lookup} className="rounded-[22px] border border-line/80 bg-white p-4">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Order number
            </label>
            <input
              value={form.orderNumber}
              onChange={(event) => setForm({ ...form, orderNumber: event.target.value.toUpperCase() })}
              placeholder="FR-XXXXXXXXXX"
              className="h-10 w-full rounded-xl border border-line bg-cream/40 px-3 font-mono text-[13px] font-bold tracking-wide outline-none transition focus:border-brand focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Email</label>
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              type="email"
              placeholder="you@example.com"
              className="h-10 w-full rounded-xl border border-line bg-cream/40 px-3 text-[13px] outline-none transition focus:border-brand focus:bg-white"
            />
          </div>
        </div>
        {error ? (
          <p className="mt-2 rounded-xl bg-rose-soft px-3 py-2 text-[11.5px] font-semibold text-clay">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="press mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-[12.5px] font-bold text-white hover:bg-brand-deep disabled:opacity-70"
        >
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
          Track my order <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
        <p className="mt-1.5 text-center text-[10px] text-ink-soft">
          Prefer a list?{" "}
          <Link href="/account/orders" className="font-bold text-brand hover:underline">
            Sign in to see all orders
          </Link>
        </p>
      </form>

      {order && status ? (
        <div className="animate-fade-up overflow-hidden rounded-[22px] border border-line/80 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 bg-cream/40 px-4 py-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand">{order.orderNumber}</p>
              <p className="text-[11.5px] font-bold text-ink">
                {formatMoney(order.totalCents)} · {plural(order.itemCount, "item")}
              </p>
              <p className="text-[10.5px] text-ink-soft">
                Placed{" "}
                {new Date(order.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" · "}
                {formatDeliverySlot(order.deliverySlot)}
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

          <div className="p-4">
            {order.status !== "cancelled" ? (
              <div className="grid gap-2 sm:grid-cols-4">
                {ORDER_STATUS_FLOW.map((step, index) => {
                  const done = index <= activeIndex;
                  const current = index === activeIndex;
                  return (
                    <div
                      key={step}
                      className={`rounded-xl border px-2.5 py-2 ${
                        current ? "border-brand bg-brand-soft/50" : done ? "border-brand/30 bg-cream/60" : "border-line"
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
            ) : (
              <p className="rounded-xl bg-rose-soft px-3 py-2 text-[11.5px] font-semibold text-clay">
                This order was cancelled and refunded to the original payment method.
              </p>
            )}

            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-cream/70 p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-brand">
                <PinIcon className="h-4 w-4" />
              </span>
              <div className="text-[11.5px] leading-relaxed">
                <p className="font-bold text-ink">{order.customerName}</p>
                <p className="text-ink-soft">
                  {order.address}, {order.city} {order.postcode}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              {order.items.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line/60 bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink">{item.name}</span>
                  <span className="text-[10.5px] text-ink-soft">×{item.quantity}</span>
                  <span className="text-[11px] font-bold text-ink">{formatMoney(item.priceCents * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Link
                href={`/order/${order.orderNumber}`}
                className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-[11px] font-bold text-white hover:bg-brand-deep"
              >
                Full receipt & actions <ArrowRightIcon className="h-3 w-3" />
              </Link>
              <span className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full bg-cream px-2.5 text-[10.5px] font-semibold text-ink">
                <ClockIcon className="h-3 w-3 text-brand" /> {formatDeliverySlot(order.deliverySlot)}
              </span>
              <span className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full bg-cream px-2.5 text-[10.5px] font-semibold text-ink">
                <ShieldIcon className="h-3 w-3 text-brand" />
                {order.paymentMethod === "cash" ? "Pay on delivery" : "Paid by card"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
