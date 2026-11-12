"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useAccountAddresses, useAccountOrders } from "@/components/account/data";
import { ActiveDelivery } from "@/components/account/active-delivery";
import { useSession } from "@/components/session-provider";
import { useSaved } from "@/components/saved-provider";
import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/format";
import { isActiveOrder, normaliseOrderStatus, ORDER_STATUS_LABELS } from "@/lib/order-types";
import {
  ArrowRightIcon,
  ChevronRightIcon,
  ClockIcon,
  HeartIcon,
  PinIcon,
  RefreshIcon,
  ShieldIcon,
  UserIcon,
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
  const { user, authFetch } = useSession();
  const { orders, loading: ordersLoading, reload } = useAccountOrders();
  const { addresses } = useAccountAddresses();
  const { items: savedItems, loading: savedLoading } = useSaved();
  const { cart, refresh: refreshCart } = useCart();
  const router = useRouter();
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  );
  const activeOrder = sorted.find((order) => isActiveOrder(order.status)) ?? null;
  const recent = sorted.filter((order) => order.id !== activeOrder?.id).slice(0, 3);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const cartCount = cart?.itemCount ?? 0;

  async function reorder(orderNumber: string) {
    setBusyOrder(orderNumber);
    setNotice(null);
    try {
      const response = await authFetch(`/api/orders/${orderNumber}/reorder`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as { error?: string; cartToken?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Could not add those items");
      if (data?.cartToken) window.localStorage.setItem("fresco:cart-token", data.cartToken);
      await refreshCart();
      setNotice("Added to your basket");
      await reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add those items");
    } finally {
      setBusyOrder(null);
    }
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_336px] xl:items-start">
      <div className="space-y-3">
        {/* 1 — the thing a shopper came for: their current delivery */}
        {ordersLoading ? (
          <div className="shimmer h-52 rounded-2xl" />
        ) : activeOrder ? (
          <ActiveDelivery order={activeOrder} />
        ) : null}

        {notice ? (
          <p
            role="status"
            className="rounded-xl bg-brand-soft/70 px-3 py-2 text-[12px] font-semibold text-brand-deep"
          >
            {notice}
          </p>
        ) : null}

        {/* 2 — recent orders, the most repeated task on this page */}
        <section className="rounded-2xl border border-line/80 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-2.5">
            <h2 className="text-[13px] font-bold text-ink">{activeOrder ? "Past orders" : "Your orders"}</h2>
            <Link href="/account/orders" className="text-[11.5px] font-bold text-brand hover:underline">
              View all
            </Link>
          </div>

          {ordersLoading ? (
            <div className="space-y-2 p-4">
              <div className="shimmer h-12 rounded-lg" />
              <div className="shimmer h-12 rounded-lg" />
            </div>
          ) : recent.length === 0 ? (
            <div className="px-4 py-7 text-center">
              <p className="text-[13px] font-bold text-ink">No orders yet</p>
              <p className="mx-auto mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-ink-soft">
                Your first basket takes about 30 seconds. Start with this week&apos;s produce.
              </p>
              <Link
                href="/category/fresh-produce"
                className="press mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-5 text-[12.5px] font-bold text-white hover:bg-brand-deep"
              >
                Start shopping <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line/70">
              {recent.map((order) => {
                const status =
                  ORDER_STATUS_LABELS[normaliseOrderStatus(order.status)] ?? ORDER_STATUS_LABELS.confirmed;
                return (
                  <li key={order.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Link
                      href={`/account/orders/${order.orderNumber}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <span className="flex -space-x-2">
                        {order.items.slice(0, 2).map((item) => (
                          <span
                            key={item.id}
                            className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-cream"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </span>
                        ))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[12.5px] font-bold text-ink">
                            {formatMoney(order.totalCents)}
                          </span>
                          <span className="text-[10.5px] text-ink-soft">
                            · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-ink-soft">
                          <ClockIcon className="h-3 w-3 shrink-0" />
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {status.label}
                        </span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void reorder(order.orderNumber)}
                      disabled={busyOrder === order.orderNumber}
                      className="press inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-line px-3 text-[11px] font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
                      aria-label={`Add the items from order ${order.orderNumber} to your basket`}
                    >
                      <RefreshIcon className="h-3.5 w-3.5" />
                      {busyOrder === order.orderNumber ? "Adding…" : "Reorder"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <div className="space-y-3">
        {/* 3 — basket: one compact line, only when there is something in it */}
        {cartCount > 0 ? (
          <section className="flex items-center gap-3 rounded-2xl bg-[#13261d] px-4 py-3 text-cream">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold">
                {cartCount} item{cartCount === 1 ? "" : "s"} in your basket
              </p>
              <p className="text-[10.5px] text-cream/70">
                {formatMoney(cart?.subtotalCents ?? 0)}
                {cart && cart.freeDeliveryRemainingCents > 0
                  ? ` · ${formatMoney(cart.freeDeliveryRemainingCents)} to free delivery`
                  : " · free delivery"}
              </p>
            </div>
            <Link
              href="/checkout"
              className="press inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-lime px-4 text-[12px] font-bold text-brand-deep hover:bg-white"
            >
              Checkout <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </section>
        ) : null}

        {/* 4 — saved items, only when there are some */}
        {savedLoading ? null : savedItems.length > 0 ? (
          <section className="rounded-2xl border border-line/80 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink">
                <HeartIcon className="h-3.5 w-3.5 text-clay" /> Saved for later
              </h2>
              <Link href="/account/saved" className="text-[11.5px] font-bold text-brand hover:underline">
                See all
              </Link>
            </div>
            <div className="no-scrollbar -mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
              {savedItems.slice(0, 6).map((entry) =>
                entry.product ? (
                  <Link
                    key={entry.id}
                    href={`/product/${entry.product.slug}`}
                    className="flex w-[132px] shrink-0 items-center gap-2 rounded-xl border border-line/70 p-1.5 transition hover:border-brand/40"
                  >
                    <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-cream">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.product.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 block text-[10.5px] font-semibold leading-tight text-ink">
                        {entry.product.name}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] font-extrabold text-brand-deep">
                        {formatMoney(entry.product.priceCents)}
                      </span>
                    </span>
                  </Link>
                ) : null,
              )}
            </div>
          </section>
        ) : null}

        {/* 5 — destinations: one plain list, nothing duplicated */}
        <section className="overflow-hidden rounded-2xl border border-line/80 bg-white">
          <h2 className="border-b border-line/70 px-4 py-2.5 text-[13px] font-bold text-ink">Account</h2>
          <ul className="divide-y divide-line/70">
            <MenuRow
              href="/account/addresses"
              icon={<PinIcon className="h-4 w-4" />}
              title="Delivery addresses"
              note={
                defaultAddress
                  ? `${defaultAddress.label} · ${defaultAddress.line1}, ${defaultAddress.postcode}`
                  : "Add a delivery address"
              }
            />
            <MenuRow
              href="/account/settings"
              icon={<UserIcon className="h-4 w-4" />}
              title="Profile & alerts"
              note="Name, phone, notifications and password"
            />
            <MenuRow
              href="/info/contact"
              icon={<ShieldIcon className="h-4 w-4" />}
              title="Help & contact"
              note="Delivery, refunds and freshness promise"
            />
            <li>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.localStorage.removeItem("fresco:session-token");
                  router.replace("/");
                  router.refresh();
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cream/60"
              >
                <span className="text-[12.5px] font-semibold text-ink-soft">Sign out</span>
                <span className="text-[10.5px] text-ink-soft">{user?.email}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function MenuRow({
  href,
  icon,
  title,
  note,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  note: string;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3 transition hover:bg-cream/60">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cream text-brand-deep">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-bold text-ink">{title}</span>
          <span className="block truncate text-[10.5px] text-ink-soft">{note}</span>
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-soft/60" />
      </Link>
    </li>
  );
}
