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
  CardIcon,
  CashIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  LeafIcon,
  MoonIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
  SparkleIcon,
  SunIcon,
  TruckIcon,
  WalletIcon,
} from "@/components/icons";

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

export function CheckoutForm({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const { cart, loading, add, applyCoupon, removeCoupon, isPending, quantityOf, refresh, cartToken, restoreCount, restoreBasket } = useCart();
  const { user, token: sessionToken } = useSession();
  const { addresses } = useAccountAddresses();
  const { area, slot, setSlot, openPicker } = useDelivery();
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    postcode: area.postcode,
    city: area.city,
  });
  const [addressTouched, setAddressTouched] = useState(false);
  const [payment, setPayment] = useState("card");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [staleBasket, setStaleBasket] = useState(false);
  const submittingRef = useRef(false);

  // One idempotency key per basket. Retried submits reuse it so the API
  // returns the original order instead of "basket is empty" or a duplicate.
  const checkoutKeyRef = useRef<string | null>(null);
  const getCheckoutId = useCallback(() => {
    if (checkoutKeyRef.current) return checkoutKeyRef.current;
    const storageKey = `fresco:checkout:${cartToken ?? "guest"}`;
    let key: string | null = null;
    try {
      key = window.sessionStorage.getItem(storageKey);
      if (!key) {
        key = globalThis.crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, key);
      }
    } catch {
      key = globalThis.crypto.randomUUID();
    }
    checkoutKeyRef.current = key;
    return key;
  }, [cartToken]);

  // Keep the address in sync with the chosen delivery area until the shopper
  // edits it themselves, so the picker feels connected instead of decorative.
  useEffect(() => {
    if (addressTouched) return;
    setForm((prev) => ({ ...prev, postcode: area.postcode, city: area.city }));
  }, [area, addressTouched]);

  // Signed-in shoppers get their profile applied once it is known.
  const [profileApplied, setProfileApplied] = useState(false);
  useEffect(() => {
    if (!user || profileApplied) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || user.name,
      email: prev.email || user.email,
      phone: prev.phone || user.phone,
    }));
    setProfileApplied(true);
  }, [profileApplied, user]);

  // Saved addresses arrive asynchronously — apply the default whenever they
  // land, unless the shopper has already typed their own address.
  useEffect(() => {
    if (addressTouched) return;
    const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (!preferred) return;
    const street = `${preferred.line1}${preferred.line2 ? `, ${preferred.line2}` : ""}`;
    setForm((prev) =>
      prev.address === street && prev.postcode === preferred.postcode
        ? prev
        : {
            ...prev,
            customerName: prev.customerName || preferred.recipient,
            phone: prev.phone || preferred.phone,
            address: street,
            city: preferred.city,
            postcode: preferred.postcode,
            notes: prev.notes || preferred.instructions,
          },
    );
  }, [addresses, addressTouched]);

  const update = (key: keyof FormState, value: string) => {
    if (key === "postcode" || key === "city") setAddressTouched(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Typing a postcode we serve fills the matching city automatically.
      if (key === "postcode") {
        const match = serviceAreaFor(value);
        if (match) next.city = match.city;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Ref guard: state updates are async, so two quick clicks could both pass.
    if (submittingRef.current) return;
    if (!cart?.lines.length) {
      setStaleBasket(true);
      void refresh();
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (form.customerName.trim().length < 2) nextErrors.customerName = "Please tell us your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) nextErrors.email = "Enter a valid email";
    if (form.address.trim().length < 4) nextErrors.address = "Add a street address";
    if (form.city.trim().length < 2) nextErrors.city = "Add a city";
    if (form.postcode.trim().length < 3) nextErrors.postcode = "Add a postcode";
    else if (!isServiceable(form.postcode)) {
      nextErrors.postcode = "We don't deliver here yet — change your area above";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setServerError("Almost there — a few fields need your attention.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    setStaleBasket(false);
    try {
      const orderHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (cartToken) orderHeaders["x-cart-token"] = cartToken;
      if (sessionToken) orderHeaders["x-session-token"] = sessionToken;
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: orderHeaders,
        body: JSON.stringify({
          ...form,
          deliverySlot: slot,
          paymentMethod: payment,
          checkoutId: getCheckoutId(),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { orderNumber?: string; error?: string; errors?: Record<string, string>; code?: string }
        | null;

      if (!response.ok || !data?.orderNumber) {
        setErrors(data?.errors ?? {});
        setServerError(data?.error ?? "We couldn't place the order. Please try again.");
        if (data?.code === "EMPTY_BASKET") {
          await refresh();
          // Only treat it as already-ordered if the basket is genuinely gone.
          const latest = await fetch("/api/cart", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
          const stillHasItems = Boolean(
            (latest as { cart?: { lines?: unknown[] } } | null)?.cart?.lines?.length,
          );
          if (!stillHasItems) setStaleBasket(true);
          else setServerError("Your basket changed — please review and place the order again.");
        }
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      // Clear the cached submission key so the next shop starts fresh.
      try {
        window.sessionStorage.removeItem(`fresco:checkout:${cartToken ?? "guest"}`);
      } catch {
        // ignore
      }
      await refresh();
      router.push(`/order/${data.orderNumber}`);
    } catch {
      setServerError("Network hiccup — please try again.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading && !cart) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
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
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-deep">We saved your basket</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
              {restoreCount} item{restoreCount === 1 ? "" : "s"} from your last visit can be restored instantly.
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
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl">🧺</div>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Nothing to check out yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
          Your basket is empty — but the produce aisle is full. Add a few essentials and we&apos;ll get them to you in 30
          minutes.
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
    <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-4 sm:px-6 sm:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/category/fresh-produce" className="text-[11.5px] font-semibold text-ink-soft hover:text-brand">
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
            {plural(cart.itemCount, "item")} · arrives in {slot === "express" ? "25–40 minutes" : "your chosen slot"} · no
            account needed
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-bold text-brand-deep">
          <ShieldIcon className="h-3.5 w-3.5" /> Secure demo checkout
        </span>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.32fr_1fr]">
        <form id="checkout-form" onSubmit={submit} className="space-y-3" noValidate>
          {staleBasket ? (
            <div className="rounded-[22px] border border-clay/30 bg-rose-soft p-4">
              <p className="text-[12px] font-bold text-clay">This basket has already been checked out</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
                Your order was placed and the basket was cleared, so this page was out of date. Open your orders to see
                the receipt, or start a fresh basket.
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

          <FormCard step="1" title="Contact details" note="For your receipt and delivery updates.">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field
                label="Full name"
                value={form.customerName}
                onChange={(value) => update("customerName", value)}
                error={errors.customerName}
                placeholder="Jordan Smith"
                autoComplete="name"
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(value) => update("email", value)}
                error={errors.email}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
              <Field
                label="Phone (optional)"
                value={form.phone}
                onChange={(value) => update("phone", value)}
                placeholder="(555) 012-3456"
                type="tel"
                autoComplete="tel"
              />
              <div className="rounded-xl border border-line/70 bg-cream/50 px-3 py-2">
                <p className="flex items-center gap-1 text-[10.5px] font-bold text-ink">
                  <SparkleIcon className="h-3 w-3 text-amber" /> Guest checkout
                </p>
                <p className="text-[10px] text-ink-soft">We never create an account without asking.</p>
              </div>
            </div>
          </FormCard>

          <FormCard step="2" title="Delivery address" note="Add instructions for the driver if you like.">
            {user && addresses.length ? (
              <div className="mb-2.5">
                <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                  Saved addresses
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {addresses.map((address) => {
                    const active = form.address.startsWith(address.line1);
                    return (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => {
                          setAddressTouched(true);
                          setForm((prev) => ({
                            ...prev,
                            customerName: prev.customerName || address.recipient,
                            phone: prev.phone || address.phone,
                            address: `${address.line1}${address.line2 ? `, ${address.line2}` : ""}`,
                            city: address.city,
                            postcode: address.postcode,
                            notes: address.instructions || prev.notes,
                          }));
                          setErrors({});
                        }}
                        className={`press rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition ${
                          active
                            ? "border-brand bg-brand-soft text-brand-deep"
                            : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"
                        }`}
                      >
                        {address.isDefault ? "★ " : ""}
                        {address.label} · {address.postcode}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {user ? (
              <p className="mb-2 inline-flex items-center gap-1 rounded-lg bg-brand-soft/60 px-2 py-1 text-[10.5px] font-semibold text-brand-deep">
                <CheckIcon className="h-3 w-3" /> Signed in as {user.email} — this order is saved to your account
              </p>
            ) : (
              <p className="mb-2 text-[10.5px] text-ink-soft">
                Checking out as a guest.{" "}
                <Link href="/login?next=/checkout" className="font-bold text-brand hover:underline">
                  Sign in
                </Link>{" "}
                to save this address for next time.
              </p>
            )}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Street address"
                  value={form.address}
                  onChange={(value) => update("address", value)}
                  error={errors.address}
                  placeholder="402 7th Avenue, Apt 3B"
                  autoComplete="street-address"
                />
              </div>
              <Field
                label="City"
                value={form.city}
                onChange={(value) => update("city", value)}
                error={errors.city}
                placeholder="Brooklyn"
                autoComplete="address-level2"
              />
              <div>
                <Field
                  label="Postcode"
                  value={form.postcode}
                  onChange={(value) => update("postcode", value)}
                  error={errors.postcode}
                  placeholder="11215"
                  autoComplete="postal-code"
                />
                {form.postcode.trim().length >= 3 && !isServiceable(form.postcode) ? (
                  <p className="mt-0.5 text-[10px] font-semibold text-clay">
                    Not in our delivery zone.{" "}
                    <button type="button" onClick={openPicker} className="underline underline-offset-2">
                      Change area
                    </button>
                  </p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                  Delivery notes (optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  rows={2}
                  placeholder="Buzzer 12, leave at the door if I'm not home."
                  className="w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-[13px] outline-none transition focus:border-brand focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                <ClockIcon className="h-3.5 w-3.5 text-brand" /> Choose a slot
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {deliverySlots.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSlot(option.id)}
                    className={`press rounded-xl border px-2.5 py-2 text-left transition ${
                      slot === option.id
                        ? "border-brand bg-brand-soft/60 shadow-sm"
                        : "border-line bg-white hover:border-brand/40"
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[11px] font-bold text-ink">
                      <SlotIcon name={option.icon} /> {option.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-ink-soft">{option.detail}</span>
                    <span className="mt-0.5 block text-[9px] font-semibold text-brand">{option.feeNote}</span>
                  </button>
                ))}
              </div>
            </div>
          </FormCard>

          <FormCard step="3" title="Payment" note="This is a preview store — no money changes hands.">
            <div className="space-y-1.5">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPayment(method.id)}
                  className={`press flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    payment === method.id ? "border-brand bg-brand-soft/50" : "border-line bg-white hover:border-brand/40"
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-brand shadow-sm">
                    <PaymentIcon name={method.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-ink">{method.label}</span>
                    <span className="block text-[10px] text-ink-soft">{method.detail}</span>
                  </span>
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full border ${
                      payment === method.id ? "border-brand bg-brand text-white" : "border-line"
                    }`}
                  >
                    {payment === method.id ? <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                </button>
              ))}
            </div>

            {serverError ? (
              <p className="mt-2 rounded-xl bg-rose-soft px-3 py-2 text-[11.5px] font-semibold text-clay">{serverError}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-[14px] font-bold text-white shadow-[0_14px_28px_-16px_rgba(15,122,77,0.9)] hover:bg-brand-deep disabled:opacity-70 lg:hidden"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Placing your order…
                </>
              ) : (
                <>
                  Place order · {formatMoney(cart.totalCents)}
                  <ArrowRightIcon className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="mt-1.5 text-center text-[10px] text-ink-soft">
              By placing the order you agree to our freshness promise and demo terms.
            </p>
          </FormCard>
        </form>

        <aside className="space-y-3 lg:sticky lg:top-[150px]">
          <div className="rounded-[24px] border border-line/80 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[20px] font-semibold tracking-tight">Order summary</h2>
              <span className="text-[10.5px] font-semibold text-ink-soft">{plural(cart.itemCount, "item")}</span>
            </div>

            <div className="mt-2 max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {cart.lines.map((line) => (
                <div key={line.id} className="flex items-center gap-2.5">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line/70 bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={line.imageUrl} alt={line.name} className="h-full w-full object-cover" />
                    <span className="absolute -right-0 -top-0 grid h-4 w-4 place-items-center rounded-full bg-ink text-[9px] font-bold text-cream">
                      {line.quantity}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-bold text-ink">{line.name}</p>
                    <p className="truncate text-[9.5px] text-ink-soft">{line.unit}</p>
                  </div>
                  <p className="text-[11.5px] font-bold text-ink">{formatMoney(line.lineTotalCents)}</p>
                </div>
              ))}
            </div>

            {bumpItems.length ? (
              <div className="mt-3 rounded-xl border border-dashed border-brand/35 bg-brand-soft/40 p-2.5">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-deep">
                  <SparkleIcon className="h-3 w-3 text-amber" /> Last-minute add-ons
                </p>
                <div className="mt-1.5 space-y-1.5">
                  {bumpItems.map(({ product }) => (
                    <div key={product.id} className="flex items-center gap-2 rounded-lg bg-white p-1.5">
                      <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-cream">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10.5px] font-bold text-ink">{product.name}</span>
                        <span className="block text-[9.5px] font-semibold text-brand">{formatMoney(product.priceCents)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => add(product)}
                        disabled={isPending(product.id)}
                        className="press grid h-6 w-6 place-items-center rounded-full bg-ink text-cream hover:bg-brand-deep disabled:opacity-60"
                        aria-label={`Add ${product.name}`}
                      >
                        <PlusIcon className="h-3 w-3" strokeWidth={2.6} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 border-t border-line/70 pt-2.5">
              {cart.coupon ? (
                <div className="flex items-center justify-between rounded-lg bg-brand-soft/60 px-2.5 py-1.5">
                  <div>
                    <p className="text-[11px] font-bold text-brand-deep">{cart.coupon.code} applied</p>
                    <p className="text-[9.5px] text-ink-soft">{cart.coupon.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void removeCoupon();
                      setCouponMessage(null);
                    }}
                    className="press grid h-6 w-6 place-items-center rounded-full text-ink-soft hover:bg-white hover:text-clay"
                    aria-label="Remove coupon"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                      placeholder="Promo code"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-cream/40 px-2.5 text-[11.5px] font-bold uppercase tracking-wide outline-none focus:border-brand focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!couponInput.trim()) return;
                        const result = await applyCoupon(couponInput);
                        setCouponMessage(result.message);
                        if (result.ok) setCouponInput("");
                      }}
                      className="press h-9 rounded-lg bg-ink px-3 text-[11px] font-bold text-cream hover:bg-brand-deep"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {coupons.slice(0, 3).map((coupon) => (
                      <button
                        key={coupon.code}
                        type="button"
                        onClick={() => setCouponInput(coupon.code)}
                        className="rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-bold text-ink-soft hover:bg-brand-soft hover:text-brand-deep"
                      >
                        {coupon.code}
                      </button>
                    ))}
                  </div>
                  {couponMessage ? <p className="mt-1.5 text-[10px] font-semibold text-clay">{couponMessage}</p> : null}
                  {!couponMessage && !cart.coupon && cart.couponError ? (
                    <p className="mt-1.5 rounded-lg bg-amber-soft px-2 py-1 text-[10px] font-semibold text-ink">
                      {cart.couponError}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-2.5 space-y-1 text-[11.5px]">
              <Row label="Subtotal" value={formatMoney(cart.subtotalCents)} />
              {cart.savingsCents > 0 ? (
                <Row label="Multi-buy savings" value={`−${formatMoney(cart.savingsCents)}`} accent />
              ) : null}
              {cart.coupon ? <Row label={cart.coupon.code} value={`−${formatMoney(cart.discountCents)}`} accent /> : null}
              <Row
                label="Delivery"
                value={cart.deliveryCents === 0 ? "Free" : formatMoney(cart.deliveryCents)}
                accent={cart.deliveryCents === 0}
              />
            </div>

            <div className="mt-2.5 flex items-end justify-between border-t border-dashed border-line pt-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">Total</span>
              <span className="font-display text-[26px] font-semibold leading-none tracking-tight">
                {formatMoney(cart.totalCents)}
              </span>
            </div>
            {cart.savingsCents + cart.discountCents > 0 ? (
              <p className="mt-1 rounded-lg bg-brand-soft/60 px-2 py-1 text-center text-[10.5px] font-bold text-brand-deep">
                You&apos;re saving {formatMoney(cart.savingsCents + cart.discountCents)} on this order
              </p>
            ) : null}

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="press mt-2.5 hidden h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-[13px] font-bold text-white hover:bg-brand-deep disabled:opacity-70 lg:flex"
            >
              {submitting ? "Placing your order…" : `Place order · ${formatMoney(cart.totalCents)}`}
              {!submitting ? <ArrowRightIcon className="h-4 w-4" /> : null}
            </button>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[9.5px] text-ink-soft">
              <ShieldIcon className="h-3 w-3" /> Encrypted & contactless
            </p>
          </div>

          <div className="rounded-2xl border border-line/80 bg-cream/60 p-3.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-brand">
                <TruckIcon className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-bold text-ink">
                {cart.freeDeliveryRemainingCents > 0
                  ? `${formatMoney(cart.freeDeliveryRemainingCents)} away from free delivery`
                  : "Free delivery unlocked"}
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-brand"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((cart.freeDeliveryThresholdCents - cart.freeDeliveryRemainingCents) /
                        cart.freeDeliveryThresholdCents) *
                        100,
                    ),
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-soft">
              <LeafIcon className="h-3 w-3 text-brand" /> Freshness guaranteed, always.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FormCard({
  step,
  title,
  note,
  children,
}: {
  step: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-line/80 bg-white p-4">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[10.5px] font-extrabold text-lime">
          {step}
        </span>
        <div>
          <h2 className="text-[13.5px] font-bold leading-tight text-ink">{title}</h2>
          <p className="text-[10.5px] text-ink-soft">{note}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className={`h-10 w-full rounded-xl border px-3 text-[13px] outline-none transition ${
          error
            ? "border-clay/60 bg-rose-soft/40 focus:border-clay"
            : "border-line bg-cream/40 focus:border-brand focus:bg-white"
        }`}
      />
      {error ? <p className="mt-0.5 text-[10px] font-semibold text-clay">{error}</p> : null}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <span className={accent ? "font-bold text-brand" : "font-semibold text-ink"}>{value}</span>
    </div>
  );
}

function SlotIcon({ name }: { name: string }) {
  if (name === "bolt") return <BoltIcon className="h-3 w-3 text-amber" />;
  if (name === "moon") return <MoonIcon className="h-3 w-3 text-ink-soft" />;
  return <SunIcon className="h-3 w-3 text-amber" />;
}

function PaymentIcon({ name }: { name: string }) {
  if (name === "wallet") return <WalletIcon className="h-4 w-4" />;
  if (name === "cash") return <CashIcon className="h-4 w-4" />;
  return <CardIcon className="h-4 w-4" />;
}
