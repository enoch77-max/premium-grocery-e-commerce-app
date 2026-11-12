"use client";

import Link from "next/link";
import type { AccountAddress } from "@/components/account/data";
import type { DeliveryArea } from "@/lib/delivery";
import { deliverySlots, formatMoney, paymentMethods, plural } from "@/lib/format";
import { isServiceable } from "@/lib/delivery";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
} from "@/components/icons";
import { FormCard, Field, SlotIcon, PaymentIcon } from "./checkout-fields";

export type FormState = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  notes: string;
};

/** The three checkout steps (contact, delivery, payment). Pure presentation. */
export function CheckoutSections({
  form,
  errors,
  update,
  addresses,
  applyAddress,
  area,
  slot,
  setSlot,
  payment,
  setPayment,
  serverError,
  submitting,
  staleBasket,
  openPicker,
  user,
  setForm,
  setAddressTouched,
  setErrors,
  cartOpen,
  onUseCart,
  cartTotal,
}: {
  form: FormState;
  errors: Record<string, string>;
  update: (key: keyof FormState, value: string) => void;
  addresses: AccountAddress[];
  applyAddress: () => void;
  area: DeliveryArea;
  slot: string;
  setSlot: (id: string) => void;
  payment: string;
  setPayment: (id: string) => void;
  serverError: string | null;
  submitting: boolean;
  staleBasket: boolean;
  openPicker: () => void;
  user: { name: string; email: string; phone: string } | null;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  setAddressTouched: (value: boolean) => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  cartOpen: () => void;
  onUseCart: () => void;
  cartTotal: number;
}) {
  return (
    <>
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
              aria-pressed={payment === method.id}
              className={`press flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition sm:min-h-0 ${
                payment === method.id
                  ? "border-brand bg-brand-soft/50"
                  : "border-line bg-white hover:border-brand/40"
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
          <p className="mt-2 rounded-xl bg-rose-soft px-3 py-2 text-[11.5px] font-semibold text-clay">
            {serverError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="press mt-3 hidden h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-[14px] font-bold text-white shadow-[0_14px_28px_-16px_rgba(15,122,77,0.9)] hover:bg-brand-deep disabled:opacity-70"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Placing your order…
            </>
          ) : (
            <>
              Place order · {formatMoney(cartTotal)}
              <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-ink-soft">
          By placing the order you agree to our freshness promise and demo terms.
        </p>
      </FormCard>
    </>
  );
}
