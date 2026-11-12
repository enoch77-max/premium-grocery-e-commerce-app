"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useAccountOrders } from "@/components/account/data";
import { formatMoney, plural } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/order-types";
import { useCart } from "@/components/cart-provider";
import { useSession } from "@/components/session-provider";
import { ArrowRightIcon, CheckIcon, RefreshIcon } from "@/components/icons";

const FILTERS = [
  { id: "all", label: "All orders" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export default function OrdersPage() {
  return (
    <AccountGate>
      <AccountShell>
        <OrdersList />
      </AccountShell>
    </AccountGate>
  );
}

function OrdersList() {
  const { orders, loading, error, reload } = useAccountOrders();
  const { cart, openCart, refresh: refreshCart } = useCart();
  const { authFetch } = useSession();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active")
      return orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
    return orders.filter((order) => order.status === filter);
  }, [filter, orders]);

  const reorder = async (orderNumber: string) => {
    setBusy(orderNumber);
    setMessage(null);
    try {
      const response = await authFetch(`/api/orders/${orderNumber}/reorder`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as {
        cart?: unknown;
        error?: string;
        added?: number;
        unavailable?: string[];
      } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "We couldn't reorder that basket.");
        return;
      }
      setMessage(
        data?.unavailable?.length
          ? `${data.added} items added. Unavailable today: ${data.unavailable.join(", ")}.`
          : `${data?.added ?? 0} items added to your basket.`,
      );
      await refreshCart();
      openCart();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line/80 bg-white px-3 py-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`press rounded-full px-3 py-1.5 text-[11.5px] font-bold transition ${
              filter === item.id ? "bg-ink text-cream" : "text-ink-soft hover:bg-cream"
            }`}
          >
            {item.label}
            <span className="ml-1 text-[10px] opacity-70">
              {item.id === "all"
                ? orders.length
                : item.id === "active"
                  ? orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length
                  : orders.filter((order) => order.status === item.id).length}
            </span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {cart?.itemCount ? (
            <button
              type="button"
              onClick={openCart}
              className="press rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-bold text-brand-deep"
            >
              Basket · {cart.itemCount}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void reload()}
            className="press inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
          >
            <RefreshIcon className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {message ? (
        <p className="rounded-xl bg-brand-soft/70 px-3 py-2 text-[11.5px] font-semibold text-brand-deep">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-rose-soft px-3 py-2 text-[11.5px] font-semibold text-clay">{error}</p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-2xl">
            📦
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">
            {orders.length ? "No orders in this view" : "Your first order starts here"}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-soft">
            {orders.length
              ? "Try another filter — every order you place stays here with its receipt."
              : "Free delivery over $35, 30-minute slots and a freshness guarantee on every item."}
          </p>
          <Link
            href="/offers"
            className="press mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-bold text-white hover:bg-brand-deep"
          >
            Shop today&apos;s offers <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((order) => {
            const status = ORDER_STATUS_LABELS[order.status] ?? ORDER_STATUS_LABELS.confirmed;
            return (
              <article key={order.id} className="overflow-hidden rounded-2xl border border-line/80 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 bg-cream/40 px-4 py-2.5">
                  <div>
                    <p className="text-[11.5px] font-extrabold tracking-tight text-ink">
                      {order.orderNumber}
                    </p>
                    <p className="text-[10.5px] text-ink-soft">
                      {new Date(order.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · {plural(order.itemCount, "item")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        order.status === "cancelled"
                          ? "bg-rose-soft text-clay"
                          : order.status === "delivered"
                            ? "bg-brand-soft text-brand-deep"
                            : "bg-amber-soft text-ink"
                      }`}
                    >
                      {order.status === "delivered" ? <CheckIcon className="h-2.5 w-2.5" /> : null}
                      {status.label}
                    </span>
                    <span className="text-[13px] font-extrabold text-ink">
                      {formatMoney(order.totalCents)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        className="h-10 w-10 overflow-hidden rounded-xl border-2 border-white bg-cream"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      </span>
                    ))}
                    {order.items.length > 4 ? (
                      <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-white bg-cream-deep text-[10px] font-bold text-ink">
                        +{order.items.length - 4}
                      </span>
                    ) : null}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">
                    {order.items.map((item) => item.name).join(", ")}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void reorder(order.orderNumber)}
                      disabled={busy === order.orderNumber}
                      className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-[11px] font-bold text-white hover:bg-brand-deep disabled:opacity-60"
                    >
                      {busy === order.orderNumber ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <RefreshIcon className="h-3.5 w-3.5" />
                      )}
                      Reorder
                    </button>
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="press inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
                    >
                      Details <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
