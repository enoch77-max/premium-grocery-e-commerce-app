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

export function CartDrawer() {
  const { cart, isOpen, closeCart, loading, setQuantity, remove, applyCoupon, removeCoupon, add, isPending, restoreCount, restoreBasket } = useCart();
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
      <aside className="animate-slide-in absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col bg-cream shadow-[0_0_120px_-20px_rgba(19,38,29,0.6)]">
        <div className="flex items-center justify-between border-b border-line/80 bg-cream/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="font-display text-[22px] font-semibold leading-none tracking-tight">Your basket</h2>
            <p className="mt-1 text-[11px] font-medium text-ink-soft">
              {cart?.itemCount ? `${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"} · saved for 60 days` : "Nothing in here yet"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="press grid h-9 w-9 place-items-center rounded-full bg-white text-ink hover:bg-cream-deep"
            aria-label="Close basket"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {cart && lines.length > 0 ? (
          <div className="border-b border-line/70 bg-white px-5 py-3">
            <div className="flex items-center justify-between gap-2 text-[11.5px] font-semibold">
              {remaining > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <TruckIcon className="h-4 w-4 text-brand" />
                  You&apos;re <strong className="text-brand">{formatMoney(remaining)}</strong> from free delivery
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

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
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
                    We kept your last basket of {restoreCount} item{restoreCount === 1 ? "" : "s"}. Restore it in one tap —
                    prices update automatically.
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
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl">🧺</div>
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
                      className="flex w-full items-center justify-between text-[12px] font-semibold text-ink"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <SparkleIcon className="h-3.5 w-3.5 text-amber" /> Have a promo code?
                      </span>
                      <span className="text-[11px] font-medium text-brand">{couponOpen ? "Hide" : "Add code"}</span>
                    </button>
                    {couponOpen ? (
                      <div className="mt-2.5 flex gap-2">
                        <input
                          value={code}
                          onChange={(event) => setCode(event.target.value.toUpperCase())}
                          placeholder="FRESH10"
                          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-cream/60 px-3 text-[12px] font-bold tracking-wide uppercase outline-none focus:border-brand"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await applyCoupon(code);
                            setCouponMessage({ ok: result.ok, text: result.message });
                            if (result.ok) setCode("");
                          }}
                          className="press h-9 rounded-lg bg-ink px-3 text-[11.5px] font-bold text-cream"
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
                      Try <span className="font-bold text-ink">FRESH10</span> for $10 off $60 — the code is saved and
                      applies automatically once your basket qualifies.
                    </p>
                  </>
                )}
              </div>

              {cart.upsells.length ? (
                <div className="mt-4 rounded-2xl border border-brand/15 bg-brand-soft/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-deep">Add a little extra</p>
                    <span className="text-[10.5px] font-semibold text-brand">Save more</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {cart.upsells.slice(0, 2).map(({ product, reason }) => (
                      <div key={product.id} className="rounded-xl border border-line/70 bg-white p-2">
                        <Link href={`/product/${product.slug}`} onClick={closeCart} className="block">
                          <div className="flex items-center gap-2">
                            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-cream">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-bold leading-tight text-ink">{product.name}</span>
                              <span className="block text-[10px] font-semibold text-brand">{formatMoney(product.priceCents)}</span>
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-[9.5px] font-medium text-clay">{reason}</p>
                        </Link>
                        <button
                          type="button"
                          onClick={() => add(product)}
                          disabled={isPending(product.id)}
                          className="press mt-1.5 flex h-6 w-full items-center justify-center gap-1 rounded-md bg-ink text-[10px] font-bold text-cream hover:bg-brand-deep disabled:opacity-60"
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
          <div className="border-t border-line bg-white px-5 pb-5 pt-4">
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
                <span className={cart.deliveryCents === 0 ? "font-semibold text-brand" : "font-semibold text-ink"}>
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

function CartRow({
  line,
  pending,
  onIncrease,
  onDecrease,
  onRemove,
  onClose,
}: {
  line: CartLine;
  pending: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line/70 bg-white p-2.5">
      <div className="flex gap-3">
        <Link
          href={`/product/${line.slug}`}
          onClick={onClose}
          className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line/60 bg-cream"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={line.imageUrl} alt={line.name} className="h-full w-full object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/product/${line.slug}`} onClick={onClose} className="min-w-0">
              <p className="line-clamp-2 text-[12.5px] font-bold leading-snug text-ink">{line.name}</p>
              <p className="mt-0.5 text-[10.5px] text-ink-soft">{line.unit}</p>
            </Link>
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="press -mr-1 -mt-1 grid h-6 w-6 place-items-center rounded-full text-ink-soft hover:bg-cream-deep hover:text-clay disabled:opacity-50"
              aria-label={`Remove ${line.name}`}
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center rounded-full border border-line bg-cream/60">
              <button
                type="button"
                onClick={onDecrease}
                disabled={pending}
                className="press grid h-7 w-7 place-items-center rounded-full text-ink hover:bg-cream-deep disabled:opacity-50"
                aria-label="Decrease quantity"
              >
                <MinusIcon className="h-3.5 w-3.5" />
              </button>
              <span className="w-5 text-center text-[12px] font-bold">{line.quantity}</span>
              <button
                type="button"
                onClick={onIncrease}
                disabled={pending || line.quantity >= Math.max(1, Math.min(20, line.stock))}
                title={line.quantity >= line.stock ? `Only ${line.stock} available today` : undefined}
                className="press grid h-7 w-7 place-items-center rounded-full text-ink hover:bg-cream-deep disabled:opacity-50"
                aria-label="Increase quantity"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-ink">{formatMoney(line.lineTotalCents)}</p>
              {line.compareAtCents ? (
                <p className="text-[10px] font-medium text-ink-soft line-through">
                  {formatMoney(line.compareAtCents * line.quantity)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
