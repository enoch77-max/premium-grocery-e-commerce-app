"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";

type AdminOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  email: string;
  city: string;
  postcode: string;
  totalCents: number;
  itemCount: number;
  status: string;
  createdAt: string;
  deliverySlot: string;
  paymentMethod: string;
};

const FLOW = ["confirmed", "packing", "on_the_way", "delivered"] as const;
const FILTERS = ["all", ...FLOW, "cancelled"] as const;

export function OrderManager({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? orders : orders.filter((order) => order.status === filter)),
    [filter, orders],
  );

  async function update(orderNumber: string, status: string) {
    setBusy(orderNumber);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, status }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; data?: { order: AdminOrder } };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Update failed");
      if (data.data?.order) {
        const updated = data.data.order;
        setOrders((prev) =>
          prev.map((order) =>
            order.orderNumber === orderNumber ? { ...order, status: updated.status } : order,
          ),
        );
      }
      setMessage(`${orderNumber} → ${status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`press h-9 shrink-0 rounded-full px-3.5 text-[12px] font-bold capitalize ${
              filter === option ? "bg-ink text-cream" : "border border-line bg-white text-ink-soft"
            }`}
          >
            {option.replace("-", " ")}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-xl bg-brand-soft/60 px-3 py-2 text-[12px] font-semibold text-brand-deep">
          {message}
        </p>
      ) : null}

      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-white/60 px-4 py-8 text-center text-[12.5px] text-ink-soft">
            No orders in this state.
          </p>
        ) : null}
        {visible.map((order) => {
          const index = FLOW.indexOf(order.status as (typeof FLOW)[number]);
          const next = index >= 0 && index < FLOW.length - 1 ? FLOW[index + 1] : null;
          return (
            <article key={order.orderNumber} className="rounded-2xl border border-line bg-white p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold">{order.customerName}</p>
                  <p className="text-[11px] text-ink-soft">
                    {order.orderNumber} · {order.itemCount} items · {order.city} {order.postcode}
                  </p>
                  <p className="text-[10.5px] text-ink-soft">
                    {new Date(order.createdAt).toLocaleString()} · {order.paymentMethod} · slot{" "}
                    {order.deliverySlot}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-extrabold">{formatMoney(order.totalCents)}</p>
                  <span
                    className={`mt-1 inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      order.status === "cancelled"
                        ? "bg-rose-soft text-clay"
                        : order.status === "delivered"
                          ? "bg-brand-soft text-brand-deep"
                          : "bg-amber-soft text-ink"
                    }`}
                  >
                    {order.status.replace(/-/g, " ")}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {next ? (
                  <button
                    type="button"
                    disabled={busy === order.orderNumber}
                    onClick={() => void update(order.orderNumber, next)}
                    className="press inline-flex h-9 items-center rounded-full bg-brand px-3.5 text-[11.5px] font-bold text-white disabled:opacity-60"
                  >
                    {busy === order.orderNumber ? "Saving…" : `Mark ${next.replace(/-/g, " ")}`}
                  </button>
                ) : null}
                <Link
                  href={`/order/${order.orderNumber}`}
                  className="press inline-flex h-9 items-center rounded-full border border-line px-3.5 text-[11.5px] font-bold text-ink"
                >
                  Receipt
                </Link>
                {order.status !== "cancelled" && order.status !== "delivered" ? (
                  <button
                    type="button"
                    disabled={busy === order.orderNumber}
                    onClick={() => void update(order.orderNumber, "cancelled")}
                    className="press inline-flex h-9 items-center rounded-full border border-line px-3.5 text-[11.5px] font-bold text-ink-soft disabled:opacity-60"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
