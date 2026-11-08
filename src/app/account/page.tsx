"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AccountGate, AccountShell, initials } from "@/components/account-shell";
import { useAccountAddresses, useAccountOrders } from "@/components/account/data";
import { useSession } from "@/components/session-provider";
import { useCart } from "@/components/cart-provider";
import { formatMoney, plural } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/order-types";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  LeafIcon,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
} from "@/components/icons";

export default function AccountPage() {
  return (
    <AccountGate>
      <AccountShell>
        <Overview />
      </AccountShell>
    </AccountGate>
  );
}

function Overview() {
  const { user } = useSession();
  const { orders, loading: ordersLoading } = useAccountOrders();
  const { addresses } = useAccountAddresses();
  const { cart, openCart } = useCart();

  const stats = useMemo(() => {
    const active = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
    const delivered = orders.filter((order) => order.status === "delivered");
    const saved = orders.reduce((sum, order) => sum + order.savingsCents, 0);
    const spend = orders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + order.totalCents, 0);
    return { active: active.length, delivered: delivered.length, saved, spend, total: orders.length };
  }, [orders]);

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Orders placed", value: String(stats.total), note: `${stats.active} active · ${stats.delivered} delivered`, icon: "📦" },
          { label: "Total saved", value: formatMoney(stats.saved), note: "Multi-buys and coupons", icon: "🏷️" },
          { label: "Basket", value: String(cart?.itemCount ?? 0), note: cart?.itemCount ? `${formatMoney(cart.subtotalCents)} ready to go` : "Nothing added yet", icon: "🧺" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-line/80 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">{card.label}</p>
              <span className="text-base">{card.icon}</span>
            </div>
            <p className="mt-1 font-display text-[26px] font-semibold leading-none tracking-tight">{card.value}</p>
            <p className="mt-1 text-[10.5px] text-ink-soft">{card.note}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-[14px] font-extrabold text-brand-deep">
              {initials(user?.name ?? "")}
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">{user?.name}</p>
              <p className="text-[11px] text-ink-soft">
                {user?.email}
                {user?.phone ? ` · ${user.phone}` : ""}
              </p>
            </div>
          </div>
          <Link
            href="/account/settings"
            className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
          >
            Edit profile <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Link href="/account/addresses" className="press rounded-xl bg-cream/70 p-3 transition hover:bg-cream-deep/70">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
              <PinIcon className="h-3.5 w-3.5 text-brand" /> Default address
            </p>
            {defaultAddress ? (
              <>
                <p className="mt-1 text-[11.5px] font-bold text-ink">
                  {defaultAddress.label} · {defaultAddress.recipient}
                </p>
                <p className="text-[10.5px] text-ink-soft">
                  {defaultAddress.line1}
                  {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}, {defaultAddress.city} {defaultAddress.postcode}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[11px] font-semibold text-brand">Add a delivery address →</p>
            )}
          </Link>
          <div className="rounded-xl bg-cream/70 p-3">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
              <TruckIcon className="h-3.5 w-3.5 text-brand" /> Delivery
            </p>
            <p className="mt-1 text-[11.5px] font-bold text-ink">Free over $35</p>
            <p className="text-[10.5px] text-ink-soft">30-minute express · 7 days a week</p>
          </div>
          <div className="rounded-xl bg-cream/70 p-3">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
              <ShieldIcon className="h-3.5 w-3.5 text-brand" /> Account security
            </p>
            <p className="mt-1 text-[11.5px] font-bold text-ink">Password protected</p>
            <p className="text-[10.5px] text-ink-soft">Salted &amp; hashed, 30-day sessions</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold tracking-tight">Recent orders</h2>
          <Link href="/account/orders" className="text-[11.5px] font-bold text-brand hover:underline">
            View all
          </Link>
        </div>

        {ordersLoading ? (
          <div className="mt-3 space-y-2">
            {[0, 1].map((row) => (
              <div key={row} className="shimmer h-16 rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-cream/50 px-4 py-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-xl">🧺</div>
            <p className="mt-2 text-[12.5px] font-bold text-ink">No orders yet</p>
            <p className="mx-auto mt-0.5 max-w-xs text-[11px] text-ink-soft">
              Your first order takes about 30 seconds — we&apos;ll start you with this week&apos;s best offers.
            </p>
            <Link
              href="/offers"
              className="press mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[11.5px] font-bold text-white hover:bg-brand-deep"
            >
              Shop today&apos;s offers <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-2 divide-y divide-line/70">
            {orders.slice(0, 3).map((order) => {
              const status = ORDER_STATUS_LABELS[order.status] ?? ORDER_STATUS_LABELS.confirmed;
              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex flex-wrap items-center gap-3 py-2.5 transition hover:bg-cream/40"
                >
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 3).map((item) => (
                      <span key={item.id} className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-cream">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-ink">
                      {order.orderNumber} · {plural(order.itemCount, "item")}
                    </p>
                    <p className="truncate text-[10.5px] text-ink-soft">
                      {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
                      {order.items.map((item) => item.name).slice(0, 2).join(", ")}
                      {order.items.length > 2 ? "…" : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      order.status === "cancelled"
                        ? "bg-rose-soft text-clay"
                        : order.status === "delivered"
                          ? "bg-brand-soft text-brand-deep"
                          : "bg-amber-soft text-ink"
                    }`}
                  >
                    {status.label}
                  </span>
                  <span className="text-[12.5px] font-bold text-ink">{formatMoney(order.totalCents)}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-ink-soft" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#13261d] p-4 text-cream">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-lime">
            <SparkleIcon className="h-3 w-3" /> Basket ready
          </p>
          <p className="mt-1 font-display text-[21px] font-semibold leading-tight">
            {cart?.itemCount ? `${cart.itemCount} items waiting` : "Nothing in the basket yet"}
          </p>
          <p className="mt-0.5 text-[11px] text-cream/70">
            {cart?.itemCount
              ? `Subtotal ${formatMoney(cart.subtotalCents)} · delivery ${cart.deliveryCents === 0 ? "free" : formatMoney(cart.deliveryCents)}`
              : "Add a bundle and we'll have it at your door in 30 minutes."}
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={openCart}
              className="press rounded-full bg-lime px-3 py-1.5 text-[11px] font-bold text-brand-deep hover:bg-white"
            >
              {cart?.itemCount ? "Review basket" : "Open basket"}
            </button>
            <Link
              href="/"
              className="press rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-bold text-cream hover:bg-white/10"
            >
              Continue shopping
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-line/80 bg-white p-4">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand">
            <LeafIcon className="h-3.5 w-3.5" /> Freshness promise
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
            If anything arrives less than fresh, open the order and tap refund — we credit it within one working day, no
            photos or forms.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-ink">
            <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5">
              <CheckIcon className="h-3 w-3 text-brand" /> 4.9 average rating
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5">
              <ClockIcon className="h-3 w-3 text-brand" /> 30-min slots
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
