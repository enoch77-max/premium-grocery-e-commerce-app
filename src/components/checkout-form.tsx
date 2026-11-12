"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Coupon } from "@/lib/types";
import { deliverySlots, formatMoney, paymentMethods, plural } from "@/lib/format";
import { SERVICE_AREAS, isServiceable } from "@/lib/delivery";
import { useCart } from "@/components/cart-provider";
import { useDelivery } from "@/components/delivery-provider";
import { useSession } from "@/components/session-provider";
import { useAccountAddresses } from "@/components/account/data";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  LeafIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
} from "@/components/icons";
import { useCheckout } from "@/features/checkout/hooks/use-checkout";
import { CheckoutSections } from "@/features/checkout/components/checkout-sections";
import { OrderSummary } from "@/features/checkout/components/order-summary";

function serviceAreaFor(postcode: string) {
  const clean = postcode.trim();
  return SERVICE_AREAS.find((area) => area.postcode === clean) ?? null;
}

type FormState = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  notes: string;
};

const initialForm: FormState = {
  customerName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postcode: "11215",
  notes: "",
};

export function CheckoutForm({
  coupons,
  storeOpen = true,
  supportEmail = "hello@fresco.demo",
}: {
  coupons: Coupon[];
  storeOpen?: boolean;
  supportEmail?: string;
}) {
  const {
    cart,
    loading,
    user,
    addresses,
    area,
    slot,
    setSlot,
    openPicker,
    form,
    setForm,
    update,
    errors,
    setErrors,
    serverError,
    submitting,
    couponInput,
    setCouponInput,
    couponMessage,
    applyCoupon,
    removeCoupon,
    staleBasket,
    submit,
    restoreCount,
    restoreBasket,
    openCart,
    quantityOf,
    payment,
    setPayment,
    setAddressTouched,
  } = useCheckout();
  if (loading && !cart) {
    return (
      <div className="mx-auto max-w-[1180px] 2xl:max-w-[1360px] px-4 py-10 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3">
            <div className="shimmer h-28 rounded-2xl" />
            <div className="shimmer h-52 rounded-2xl" />
            <div className="shimmer h-32 rounded-2xl" />
          </div>
          <div className="shimmer h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-16 text-center">
        {restoreCount > 0 ? (
          <div className="mx-auto mb-6 max-w-md rounded-2xl border border-dashed border-brand/40 bg-brand-soft/40 p-4 text-left">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-deep">
              We saved your basket
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
              {restoreCount} item{restoreCount === 1 ? "" : "s"} from your last visit can be restored
              instantly.
            </p>
            <button
              type="button"
              onClick={() => void restoreBasket()}
              className="press mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-[12px] font-bold text-white hover:bg-brand-deep"
            >
              <PlusIcon className="h-3.5 w-3.5" /> Restore my basket
            </button>
          </div>
        ) : null}
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl">
          🧺
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Nothing to check out yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
          Your basket is empty — but the produce aisle is full. Add a few essentials and we&apos;ll get them
          to you in 30 minutes.
        </p>
        <Link
          href="/category/fresh-produce"
          className="press mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-[13px] font-bold text-white hover:bg-brand-deep"
        >
          Start shopping <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const bumpItems = cart.upsells.filter(({ product }) => quantityOf(product.id) === 0).slice(0, 2);

  return (
    <div className="mx-auto max-w-[1180px] 2xl:max-w-[1360px] px-3.5 pb-28 pt-4 sm:px-6 sm:pt-5 lg:pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/category/fresh-produce"
          className="text-[11.5px] font-semibold text-ink-soft hover:text-brand"
        >
          ← Continue shopping
        </Link>
        <div className="flex items-center gap-2 text-[10.5px] font-bold">
          {[
            { label: "Basket", done: true },
            { label: "Details", done: false, active: true },
            { label: "Confirmation", done: false },
          ].map((step, index) => (
            <span key={step.label} className="flex items-center gap-1.5">
              {index > 0 ? <span className="text-line">—</span> : null}
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] ${
                  step.done
                    ? "bg-brand text-white"
                    : step.active
                      ? "bg-ink text-cream"
                      : "border border-line bg-white text-ink-soft"
                }`}
              >
                {step.done ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : index + 1}
              </span>
              <span className={step.active ? "text-ink" : "text-ink-soft"}>{step.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-none tracking-[-0.02em] sm:text-[34px]">
            Checkout
          </h1>
          <p className="mt-1 text-[12px] text-ink-soft">
            {plural(cart.itemCount, "item")} · arrives in{" "}
            {slot === "express" ? "25–40 minutes" : "your chosen slot"} · no account needed
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-bold text-brand-deep">
          <ShieldIcon className="h-3.5 w-3.5" /> Secure demo checkout
        </span>
      </div>

      {!storeOpen ? (
        <div className="mt-3 rounded-[22px] border border-clay/30 bg-rose-soft p-4">
          <p className="text-[12.5px] font-bold text-clay">Ordering is paused</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
            We are restocking right now. Your basket is saved — try again shortly, or email{" "}
            <a href={`mailto:${supportEmail}`} className="font-semibold underline">
              {supportEmail}
            </a>{" "}
            for a bulk order.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.32fr_1fr]">
        <form id="checkout-form" onSubmit={submit} className="space-y-3" noValidate>
          {staleBasket ? (
            <div className="rounded-[22px] border border-clay/30 bg-rose-soft p-4">
              <p className="text-[12px] font-bold text-clay">This basket has already been checked out</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                Your order was placed and the basket was cleared, so this page was out of date. Open your
                orders to see the receipt, or start a fresh basket.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Link
                  href="/account/orders"
                  className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-[11px] font-bold text-white hover:bg-brand-deep"
                >
                  View my orders <ArrowRightIcon className="h-3 w-3" />
                </Link>
                <Link
                  href="/"
                  className="press inline-flex h-8 items-center rounded-full border border-line bg-white px-3 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
                >
                  Start a new basket
                </Link>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[22px] border border-brand/20 bg-brand-soft/50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-brand">
                <PinIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11.5px] font-bold text-ink">
                  Delivering to {area.neighbourhood}, {area.postcode}
                </p>
                <p className="text-[10.5px] text-ink-soft">
                  {area.eta} express · {area.slots.length} slots available today
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openPicker}
              className="press rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
            >
              Change area
            </button>
          </div>
          <CheckoutSections
            form={form}
            errors={errors}
            update={update}
            addresses={addresses}
            applyAddress={() => {}}
            area={area}
            slot={slot}
            setSlot={setSlot}
            payment={payment}
            setPayment={setPayment}
            serverError={serverError}
            submitting={submitting}
            staleBasket={staleBasket}
            openPicker={openPicker}
            user={user}
            setForm={setForm}
            setAddressTouched={setAddressTouched}
            setErrors={setErrors}
            cartOpen={openCart}
            onUseCart={openCart}
            cartTotal={cart.totalCents}
          />
        </form>

        <OrderSummary
          cart={cart}
          submitting={submitting}
          staleBasket={staleBasket}
          couponInput={couponInput}
          couponMessage={couponMessage}
          onCouponInput={setCouponInput}
          onApplyCoupon={() => void applyCoupon(couponInput)}
          onRemoveCoupon={() => void removeCoupon()}
          onSubmit={() => {
            const formEl = typeof document !== "undefined" ? document.getElementById("checkout-form") : null;
            formEl?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
          }}
        />
      </div>

      {/* On a phone the totals live in a bar pinned above the bottom navigation
          so the price and the submit action are never a screenful away. */}
      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+var(--safe-b))] z-40 border-t border-line bg-white/95 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              {plural(cart.itemCount, "item")} · total
            </p>
            <p className="font-display text-[22px] font-semibold leading-none tracking-tight text-ink">
              {formatMoney(cart.totalCents)}
            </p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={submitting}
            className="press flex h-12 shrink-0 items-center gap-2 rounded-full bg-brand px-6 text-[14px] font-bold text-white shadow-[0_14px_28px_-16px_rgba(15,122,77,0.9)] hover:bg-brand-deep disabled:opacity-70"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Placing…
              </>
            ) : (
              <>
                Place order <ArrowRightIcon className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
