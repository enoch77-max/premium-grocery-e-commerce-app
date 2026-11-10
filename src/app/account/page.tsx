"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useAccountAddresses, useAccountOrders } from "@/components/account/data";
import { ActiveDelivery } from "@/components/account/active-delivery";
import { useSession } from "@/components/session-provider";
import { useSaved } from "@/components/saved-provider";
import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/format";
import { isActiveOrder } from "@/lib/order-types";
import {
  ArrowRightIcon,
  CheckIcon,
  HeartIcon,
  PackageIcon,
  PinIcon,
  PlusIcon,
  SparkleIcon,
  TruckIcon,
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

/** Action shortcuts instead of KPI tiles. This is where a shopper starts, not a report. */
const SHORTCUTS = [
  { href: "/account/orders", label: "Your orders", note: "Track & reorder", Icon: PackageIcon },
  { href: "/account/saved", label: "Saved items", note: "Your wishlist", Icon: HeartIcon },
  { href: "/account/addresses", label: "Addresses", note: "Where we deliver", Icon: PinIcon },
  { href: "/account/settings", label: "Settings", note: "Profile & alerts", Icon: UserIcon },
];

function Overview() {
  const { user } = useSession();
  const { orders, loading: ordersLoading } = useAccountOrders();
  const { addresses } = useAccountAddresses();
  const { items: savedItems, loading: savedLoading } = useSaved();
  const { cart, openCart } = useCart();

  const activeOrder = useMemo(
    () =>
      [...orders]
        .filter((order) => isActiveOrder(order.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null,
    [orders],
  );

  const lastOrder = useMemo(() => {
    if (activeOrder) return null;
    return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  }, [activeOrder, orders]);

  const totalSaved = useMemo(
    () => orders.reduce((sum, order) => sum + (order.savingsCents > 0 ? order.savingsCents : 0), 0),
    [orders],
  );

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const cartCount = cart?.itemCount ?? 0;

  return (
    <>
      {/* ---- next delivery / last order: the reason most people open this tab ---- */}
      {ordersLoading ? (
        <div className="shimmer h-56 rounded-3xl" />
      ) : activeOrder ? (
        <ActiveDelivery order={activeOrder} />
      ) : lastOrder ? (
        <ActiveDelivery order={lastOrder} />
      ) : (
        <section className="rounded-3xl border border-brand/25 bg-brand-soft/40 p-5">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-deep">
            <SparkleIcon className="h-3 w-3" /> Welcome, {user?.name.split(" ")[0] ?? "shopper"}
          </p>
          <h2 className="mt-1.5 font-display text-[24px] font-semibold leading-tight tracking-tight">
            Let&apos;s get your first basket in.
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            Fresh produce, bakery and pantry staples delivered in about 30 minutes. Add a bundle and the savings apply
            themselves.
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Link
              href="/category/fresh-produce"
              className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-brand px-5 text-[13px] font-bold text-white hover:bg-brand-deep"
            >
              Start shopping <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/offers"
              className="press inline-flex h-11 items-center rounded-full border border-line bg-white px-5 text-[13px] font-bold text-ink hover:border-brand hover:text-brand"
            >
              Today&apos;s offers
            </Link>
          </div>
        </section>
      )}

      {/* ---- shortcuts row (AliExpress-style, shopping actions not statistics) ---- */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SHORTCUTS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="press flex min-h-[72px] items-center gap-2.5 rounded-2xl border border-line/80 bg-white px-3 py-2.5 hover:border-brand/30 hover:shadow-card"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep" aria-hidden>
              <item.Icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-bold text-ink">{item.label}</span>
              <span className="block truncate text-[10.5px] text-ink-soft">{item.note}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* ---- basket: the one thing you can act on right now ---- */}
      <section className="overflow-hidden rounded-3xl bg-[#13261d] p-4 text-cream">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-lime">
              <SparkleIcon className="h-3 w-3" /> Your basket
            </p>
            <p className="mt-1 font-display text-[22px] font-semibold leading-tight">
              {cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"} ready` : "Nothing in here yet"}
            </p>
            <p className="mt-0.5 text-[11.5px] text-cream/70">
              {cartCount
                ? `${formatMoney(cart?.subtotalCents ?? 0)} · ${
                    cart?.deliveryCents === 0 ? "free delivery" : `${formatMoney(cart?.deliveryCents ?? 0)} delivery`
                  }`
                : "Pick a bundle and the multi-buy savings apply automatically."}
            </p>
            {cart && cart.freeDeliveryRemainingCents > 0 && cartCount ? (
              <p className="mt-1 text-[10.5px] font-semibold text-lime">
                {formatMoney(cart.freeDeliveryRemainingCents)} more for free delivery
              </p>
            ) : null}
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={openCart}
              className="press flex h-11 flex-1 items-center justify-center rounded-full bg-lime px-4 text-[12.5px] font-bold text-brand-deep hover:bg-white sm:flex-none"
            >
              {cartCount ? "Review basket" : "Open basket"}
            </button>
            <Link
              href={cartCount ? "/checkout" : "/category/fresh-produce"}
              className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 px-4 text-[12.5px] font-bold text-cream hover:bg-white/10 sm:flex-none"
            >
              {cartCount ? "Checkout" : "Browse aisles"} <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---- saved items: real wishlist, with prices and quick add ---- */}
      <section className="rounded-3xl border border-line/80 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <HeartIcon className="h-4 w-4 text-clay" /> Saved for later
          </h2>
          <Link href="/account/saved" className="text-[11.5px] font-bold text-brand hover:underline">
            See all
          </Link>
        </div>
        {savedLoading ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((slot) => (
              <div key={slot} className="shimmer h-32 rounded-xl" />
            ))}
          </div>
        ) : savedItems.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-line bg-cream/50 px-4 py-6 text-center">
            <p className="text-[12.5px] font-bold text-ink">Tap the heart on anything you like</p>
            <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-ink-soft">
              Saved items live here so your regulars are one tap away next week.
            </p>
            <Link
              href="/category/fresh-produce"
              className="press mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand"
            >
              Find favourites
            </Link>
          </div>
        ) : (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {savedItems.slice(0, 6).map((entry) => {
              const product = entry.product;
              if (!product) return null;
              return (
                <Link
                  key={entry.id}
                  href={`/product/${product.slug}`}
                  className="w-[128px] shrink-0 rounded-xl border border-line/80 bg-cream/40 p-2 transition hover:border-brand/40"
                >
                  <span className="block aspect-square overflow-hidden rounded-lg bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                  </span>
                  <span className="mt-1.5 line-clamp-2 block text-[11px] font-bold leading-tight text-ink">
                    {product.name}
                  </span>
                  <span className="mt-0.5 block text-[12px] font-extrabold text-brand-deep">
                    {formatMoney(product.priceCents)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- delivery details + savings, supporting rather than leading ---- */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/account/addresses"
          className="press rounded-3xl border border-line/80 bg-white p-4 transition hover:border-brand/30"
        >
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand">
            <PinIcon className="h-3.5 w-3.5" /> Default delivery address
          </p>
          {defaultAddress ? (
            <>
              <p className="mt-1.5 text-[12.5px] font-bold text-ink">{defaultAddress.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                {defaultAddress.line1}
                {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}, {defaultAddress.city} {defaultAddress.postcode}
              </p>
              {defaultAddress.instructions ? (
                <p className="mt-1 text-[10.5px] text-ink-soft">“{defaultAddress.instructions}”</p>
              ) : null}
            </>
          ) : (
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
              Add an address so checkout takes seconds.
            </p>
          )}
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand">
            {defaultAddress ? "Edit addresses" : "Add address"} <ArrowRightIcon className="h-3 w-3" />
          </span>
        </Link>

        <div className="rounded-3xl border border-line/80 bg-white p-4">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand">
            <TruckIcon className="h-3.5 w-3.5" /> Your savings
          </p>
          <p className="mt-1.5 font-display text-[24px] font-semibold leading-none tracking-tight">
            {formatMoney(totalSaved)}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
            From multi-buys and coupons across your orders.
          </p>
          <Link
            href="/offers"
            className="press mt-2 inline-flex h-9 items-center gap-1 rounded-full border border-line px-3.5 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
          >
            Save more this week <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ---- first-run checklist, only while it is genuinely useful ---- */}
      {!ordersLoading && orders.length === 0 ? (
        <section className="rounded-3xl border border-line/80 bg-white p-4">
          <h2 className="text-[13px] font-bold text-ink">Finish setting up</h2>
          <ol className="mt-2.5 space-y-2">
            {[
              {
                title: "Add a delivery address",
                href: "/account/addresses",
                cta: defaultAddress ? "Review" : "Add",
                done: Boolean(defaultAddress),
              },
              { title: "Fill your basket", href: "/category/fresh-produce", cta: "Shop", done: cartCount > 0 },
              { title: "Place your first order", href: cartCount ? "/checkout" : "/offers", cta: cartCount ? "Checkout" : "See offers", done: false },
            ].map((step, index) => (
              <li key={step.title} className="flex items-center gap-3 rounded-xl bg-cream/60 px-3 py-2">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
                    step.done ? "bg-brand text-white" : "bg-cream-deep text-ink"
                  }`}
                >
                  {step.done ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 text-[12px] font-semibold text-ink">{step.title}</span>
                <Link
                  href={step.href}
                  className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
                >
                  {step.cta}
                  {step.done ? null : <PlusIcon className="h-3 w-3" />}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
