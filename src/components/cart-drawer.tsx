"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CartLine } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
} from "@/components/icons";
import { CartRow } from "@/components/cart-row";

export function CartDrawer() {
  const {
    cart,
    isOpen,
    closeCart,
    loading,
    setQuantity,
    remove,
    applyCoupon,
    removeCoupon,
    add,
    isPending,
    restoreCount,
    restoreBasket,
  } = useCart();
  const [couponOpen, setCouponOpen] = useState(false);
  const [code, setCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const lines = cart?.lines ?? [];
  const remaining = cart?.freeDeliveryRemainingCents ?? 0;
  const threshold = cart?.freeDeliveryThresholdCents ?? 3500;
  const progress = Math.min(100, Math.round(((threshold - remaining) / threshold) * 100));

  return (
    <div className="fixed inset-0 z-[85]">
      <button
        type="button"
        aria-label="Close basket"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={closeCart}
      />
      {/* Phones: a bottom sheet that rises to the thumb. Tablets/desktop: the
          original right-hand drawer. Same markup, different anchoring. */}
      <aside
        className="animate-drawer absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-cream shadow-[0_-24px_60px_-30px_rgba(19,38,29,0.65)] sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-[430px] sm:rounded-none sm:shadow-[0_0_120px_-20px_rgba(19,38,29,0.6)]"
        role="dialog"
        aria-modal="true"
        aria-label="Your basket"
      >
        <div className="shrink-0 border-b border-line/80 bg-cream/95 px-4 pb-3 pt-2 backdrop-blur sm:px-5 sm:pt-4">
          <span className="mx-auto mb-2 block h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-[20px] font-semibold leading-none tracking-tight sm:text-[22px]">
                Your basket
              </h2>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">
                {cart?.itemCount
                  ? `${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"} · saved for 60 days`
                  : "Nothing in here yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="press tap-xl -mr-1 grid shrink-0 place-items-center rounded-full bg-white text-ink hover:bg-cream-deep"
              aria-label="Close basket"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {cart && lines.length > 0 ? (
          <div className="shrink-0 border-b border-line/70 bg-white px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2 text-[11.5px] font-semibold">
              {remaining > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <TruckIcon className="h-4 w-4 text-brand" />
                  You&apos;re <strong className="text-brand">{formatMoney(remaining)}</strong> from free
                  delivery
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-brand-deep">
                  <CheckIcon className="h-4 w-4" /> Free delivery unlocked
                </span>
              )}
              <span className="text-[10.5px] font-medium text-ink-soft">{formatMoney(threshold)} min</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-deep">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-[#4fbf7f] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3.5 sm:px-5 sm:py-4">
          {loading && !cart ? (
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex gap-3">
                  <div className="shimmer h-16 w-16 rounded-xl" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="shimmer h-3 w-3/4 rounded" />
                    <div className="shimmer h-3 w-1/3 rounded" />
                    <div className="shimmer h-6 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && cart && lines.length === 0 ? (
            <div className="pt-6 text-center">
              {restoreCount > 0 ? (
                <div className="mb-5 rounded-2xl border border-dashed border-brand/40 bg-brand-soft/40 p-3 text-left">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-deep">
                    Welcome back
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                    We kept your last basket of {restoreCount} item{restoreCount === 1 ? "" : "s"}. Restore it
                    in one tap — prices update automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => void restoreBasket()}
                    className="press mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-[11.5px] font-bold text-white hover:bg-brand-deep"
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> Restore my basket
                  </button>
                </div>
              ) : null}
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl">
                🧺
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold">A basket this empty is a shame</h3>
              <p className="mx-auto mt-1.5 max-w-[260px] text-[12.5px] leading-relaxed text-ink-soft">
                Add a few essentials and we&apos;ll get them to your door in under 30 minutes.
              </p>
              <Link
                href="/category/fresh-produce"
                onClick={closeCart}
                className="press mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[12px] font-bold text-cream"
              >
                Shop fresh produce <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : null}

          {lines.length > 0 ? (
            <div className="space-y-3">
              {lines.map((line) => (
                <CartRow
                  key={line.id}
                  line={line}
                  pending={isPending(line.productId)}
                  onIncrease={() => setQuantity(line.productId, line.quantity + 1)}
                  onDecrease={() => setQuantity(line.productId, line.quantity - 1)}
                  onRemove={() => remove(line.productId)}
                  onClose={closeCart}
                />
              ))}
            </div>
          ) : null}

          {cart && lines.length > 0 ? (
            <>
              <div className="mt-4 rounded-2xl border border-line/80 bg-white p-3">
                {cart.coupon ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[12.5px] font-bold text-ink">{cart.coupon.code} applied</p>
                        <p className="text-[11px] text-ink-soft">
                          {cart.coupon.description} — saving {formatMoney(cart.coupon.discountCents)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void removeCoupon();
                        setCouponMessage(null);
                      }}
                      className="text-[11px] font-semibold text-ink-soft underline-offset-2 hover:text-clay hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setCouponOpen((value) => !value)}
                      className="flex min-h-[44px] w-full items-center justify-between text-[12.5px] font-semibold text-ink sm:min-h-0 sm:text-[12px]"
                      aria-expanded={couponOpen}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <SparkleIcon className="h-3.5 w-3.5 text-amber" /> Have a promo code?
                      </span>
                      <span className="text-[11px] font-medium text-brand">
                        {couponOpen ? "Hide" : "Add code"}
                      </span>
                    </button>
                    {couponOpen ? (
                      <div className="mt-2.5 flex gap-2">
                        <input
                          value={code}
                          onChange={(event) => setCode(event.target.value.toUpperCase())}
                          placeholder="FRESH10"
                          autoCapitalize="characters"
                          enterKeyHint="done"
                          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-cream/60 px-3 text-[13px] font-bold tracking-wide uppercase outline-none focus:border-brand sm:h-9 sm:text-[12px]"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await applyCoupon(code);
                            setCouponMessage({ ok: result.ok, text: result.message });
                            if (result.ok) setCode("");
                          }}
                          className="press h-11 shrink-0 rounded-lg bg-ink px-4 text-[12.5px] font-bold text-cream sm:h-9 sm:px-3 sm:text-[11.5px]"
                        >
                          Apply
                        </button>
                      </div>
                    ) : null}
                    {couponMessage ? (
                      <p className={`mt-2 text-[11px] ${couponMessage.ok ? "text-brand" : "text-clay"}`}>
                        {couponMessage.text}
                      </p>
                    ) : null}
                    {!couponMessage && cart.couponError ? (
                      <div className="mt-2 flex items-start justify-between gap-2 rounded-lg bg-amber-soft px-2 py-1">
                        <p className="text-[10.5px] font-semibold text-ink">{cart.couponError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            void removeCoupon();
                            setCouponMessage(null);
                          }}
                          className="shrink-0 text-[10px] font-bold text-clay underline-offset-2 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                    <p className="mt-2 text-[10.5px] text-ink-soft">
                      Try <span className="font-bold text-ink">FRESH10</span> for $10 off $60 — the code is
                      saved and applies automatically once your basket qualifies.
                    </p>
                  </>
                )}
              </div>

              {cart.upsells.length ? (
                <div className="mt-4 rounded-2xl border border-brand/15 bg-brand-soft/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-deep">
                      Add a little extra
                    </p>
                    <span className="text-[10.5px] font-semibold text-brand">Save more</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {cart.upsells.slice(0, 2).map(({ product, reason }) => (
                      <div key={product.id} className="rounded-xl border border-line/70 bg-white p-2">
                        <Link href={`/product/${product.slug}`} onClick={closeCart} className="block">
                          <div className="flex items-center gap-2">
                            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-cream">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-bold leading-tight text-ink">
                                {product.name}
                              </span>
                              <span className="block text-[10px] font-semibold text-brand">
                                {formatMoney(product.priceCents)}
                              </span>
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-[9.5px] font-medium text-clay">{reason}</p>
                        </Link>
                        <button
                          type="button"
                          onClick={() => add(product)}
                          disabled={isPending(product.id)}
                          className="press mt-1.5 flex h-9 w-full items-center justify-center gap-1 rounded-md bg-ink text-[11px] font-bold text-cream hover:bg-brand-deep disabled:opacity-60 sm:h-6 sm:text-[10px]"
                        >
                          <PlusIcon className="h-3 w-3" /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {cart && lines.length > 0 ? (
          <div className="safe-b shrink-0 border-t border-line bg-white px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4">
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">{formatMoney(cart.subtotalCents)}</span>
              </div>
              {cart.savingsCents > 0 ? (
                <div className="flex justify-between text-brand">
                  <span>Multi-buy savings</span>
                  <span className="font-semibold">−{formatMoney(cart.savingsCents)}</span>
                </div>
              ) : null}
              {cart.coupon ? (
                <div className="flex justify-between text-brand">
                  <span>{cart.coupon.code}</span>
                  <span className="font-semibold">−{formatMoney(cart.discountCents)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-ink-soft">
                <span>Delivery</span>
                <span
                  className={cart.deliveryCents === 0 ? "font-semibold text-brand" : "font-semibold text-ink"}
                >
                  {cart.deliveryCents === 0 ? "Free" : formatMoney(cart.deliveryCents)}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-dashed border-line pt-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">Total</p>
                <p className="font-display text-[26px] font-semibold leading-none tracking-tight">
                  {formatMoney(cart.totalCents)}
                </p>
              </div>
              {cart.savingsCents + cart.discountCents > 0 ? (
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-deep">
                  You save {formatMoney(cart.savingsCents + cart.discountCents)}
                </span>
              ) : null}
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="press mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-brand text-[14px] font-bold text-white shadow-[0_12px_24px_-14px_rgba(15,122,77,0.9)] hover:bg-brand-deep"
            >
              Checkout · {formatMoney(cart.totalCents)}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <ShieldIcon className="h-3.5 w-3.5" /> Secure checkout
              </span>
              <button type="button" onClick={closeCart} className="font-semibold text-ink hover:text-brand">
                Continue shopping
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
