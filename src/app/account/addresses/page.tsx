"use client";

import { useState } from "react";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useAccountAddresses, type AccountAddress } from "@/components/account/data";
import { useSession } from "@/components/session-provider";
import { useDelivery } from "@/components/delivery-provider";
import { SERVICE_AREAS } from "@/lib/delivery";
import { CheckIcon, CloseIcon, PinIcon, PlusIcon, TruckIcon } from "@/components/icons";

type FormState = {
  id?: number;
  label: string;
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  phone: string;
  instructions: string;
  isDefault: boolean;
};

const emptyForm: FormState = {
  label: "Home",
  recipient: "",
  line1: "",
  line2: "",
  city: "Brooklyn",
  postcode: "11215",
  phone: "",
  instructions: "",
  isDefault: false,
};

export default function AddressesPage() {
  return (
    <AccountGate>
      <AccountShell>
        <AddressBook />
      </AccountShell>
    </AccountGate>
  );
}

function AddressBook() {
  const { addresses, setAddresses, loading, reload } = useAccountAddresses();
  const { authFetch, user } = useSession();
  const { area, setSlot } = useDelivery();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const openNew = () =>
    setForm({ ...emptyForm, recipient: user?.name ?? "", phone: user?.phone ?? "", postcode: area.postcode, city: area.city });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const response = await authFetch("/api/account/addresses", {
        method: form.id ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, id: form.id }),
      });
      const data = (await response.json().catch(() => null)) as
        | { addresses?: AccountAddress[]; address?: AccountAddress; errors?: Record<string, string>; error?: string }
        | null;
      if (!response.ok) {
        setErrors(data?.errors ?? {});
        setMessage(data?.error ?? "We couldn't save that address.");
        return;
      }
      if (data?.addresses) setAddresses(data.addresses);
      else await reload();
      setMessage(form.id ? "Address updated." : "Address saved.");
      setForm(null);
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (address: AccountAddress) => {
    setBusy(true);
    try {
      const response = await authFetch("/api/account/addresses", {
        method: "PATCH",
        body: JSON.stringify({ ...address, id: address.id, setDefault: true }),
      });
      const data = (await response.json().catch(() => null)) as { addresses?: AccountAddress[] } | null;
      if (data?.addresses) setAddresses(data.addresses);
      setMessage(`${address.label} is now your default address.`);
      setSlot("express");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setDeleting(id);
    try {
      const response = await authFetch(`/api/account/addresses?id=${id}`, { method: "DELETE" });
      const data = (await response.json().catch(() => null)) as { addresses?: AccountAddress[] } | null;
      if (data?.addresses) setAddresses(data.addresses);
      setMessage("Address removed.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-white px-4 py-3">
        <div>
          <h2 className="inline-flex items-center gap-1.5 font-display text-[20px] font-semibold tracking-tight">
            <PinIcon className="h-4 w-4 text-brand" /> Delivery addresses
          </h2>
          <p className="text-[11px] text-ink-soft">
            {addresses.length} saved · the default one prefills checkout
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[11.5px] font-bold text-cream hover:bg-brand-deep"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Add address
        </button>
      </div>

      {message ? (
        <p className="rounded-xl bg-brand-soft/70 px-3 py-2 text-[11.5px] font-semibold text-brand-deep">{message}</p>
      ) : null}

      {form ? (
        <form onSubmit={save} className="rounded-2xl border border-line/80 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[12.5px] font-bold text-ink">{form.id ? "Edit address" : "New address"}</h3>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setErrors({});
              }}
              className="press grid h-7 w-7 place-items-center rounded-full text-ink-soft hover:bg-cream-deep"
              aria-label="Cancel"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            <Field label="Label" value={form.label} onChange={(value) => setForm({ ...form, label: value })} placeholder="Home" />
            <Field
              label="Recipient"
              value={form.recipient}
              onChange={(value) => setForm({ ...form, recipient: value })}
              placeholder="Jordan Smith"
              error={errors.recipient}
            />
            <div className="sm:col-span-2">
              <Field
                label="Street address"
                value={form.line1}
                onChange={(value) => setForm({ ...form, line1: value })}
                placeholder="402 7th Avenue"
                error={errors.line1}
              />
            </div>
            <Field
              label="Apartment / floor (optional)"
              value={form.line2}
              onChange={(value) => setForm({ ...form, line2: value })}
              placeholder="Apt 3B"
            />
            <Field
              label="Phone (optional)"
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
              placeholder="(555) 012-3456"
            />
            <div>
              <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">City</label>
              <input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                className={`h-10 w-full rounded-xl border px-3 text-[13px] outline-none transition ${
                  errors.city ? "border-clay/60 bg-rose-soft/40" : "border-line bg-cream/40 focus:border-brand focus:bg-white"
                }`}
              />
              {errors.city ? <p className="mt-0.5 text-[10px] font-semibold text-clay">{errors.city}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                Postcode (we deliver here)
              </label>
              <input
                value={form.postcode}
                onChange={(event) => setForm({ ...form, postcode: event.target.value })}
                list="service-postcodes"
                className={`h-10 w-full rounded-xl border px-3 text-[13px] outline-none transition ${
                  errors.postcode ? "border-clay/60 bg-rose-soft/40" : "border-line bg-cream/40 focus:border-brand focus:bg-white"
                }`}
              />
              <datalist id="service-postcodes">
                {SERVICE_AREAS.map((serviceArea) => (
                  <option key={serviceArea.postcode} value={serviceArea.postcode}>
                    {serviceArea.neighbourhood}
                  </option>
                ))}
              </datalist>
              {errors.postcode ? <p className="mt-0.5 text-[10px] font-semibold text-clay">{errors.postcode}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                Driver instructions (optional)
              </label>
              <input
                value={form.instructions}
                onChange={(event) => setForm({ ...form, instructions: event.target.value })}
                placeholder="Buzzer 12, leave at the door"
                className="h-10 w-full rounded-xl border border-line bg-cream/40 px-3 text-[13px] outline-none transition focus:border-brand focus:bg-white"
              />
            </div>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ink">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
              className="h-3.5 w-3.5 accent-[#0f7a4d]"
            />
            Make this my default address
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[11.5px] font-bold text-white hover:bg-brand-deep disabled:opacity-60"
            >
              {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckIcon className="h-3.5 w-3.5" />}
              Save address
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="press inline-flex h-9 items-center rounded-full border border-line px-4 text-[11.5px] font-bold text-ink-soft"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((row) => (
            <div key={row} className="shimmer h-24 rounded-2xl" />
          ))}
        </div>
      ) : addresses.length === 0 && !form ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-2xl">
            <PinIcon className="h-6 w-6 text-brand" />
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">No saved addresses</h2>
          <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-soft">
            Save your home or work address and checkout becomes a two-tap job.
          </p>
          <button
            type="button"
            onClick={openNew}
            className="press mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-bold text-white"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Add your first address
          </button>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {addresses.map((address) => (
            <article
              key={address.id}
              className={`rounded-2xl border p-4 ${address.isDefault ? "border-brand bg-brand-soft/40" : "border-line/80 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-ink">
                    {address.label}
                    {address.isDefault ? (
                      <span className="rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">Default</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">{address.recipient}</p>
                </div>
                <TruckIcon className="h-4 w-4 text-brand" />
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city} {address.postcode}
              </p>
              {address.instructions ? (
                <p className="mt-1 rounded-lg bg-cream px-2 py-1 text-[10px] italic text-ink-soft">{address.instructions}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!address.isDefault ? (
                  <button
                    type="button"
                    onClick={() => void makeDefault(address)}
                    disabled={busy}
                    className="press rounded-full border border-line px-2.5 py-1 text-[10px] font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-50"
                  >
                    Make default
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: address.id,
                      label: address.label,
                      recipient: address.recipient,
                      line1: address.line1,
                      line2: address.line2,
                      city: address.city,
                      postcode: address.postcode,
                      phone: address.phone,
                      instructions: address.instructions,
                      isDefault: address.isDefault,
                    })
                  }
                  className="press rounded-full border border-line px-2.5 py-1 text-[10px] font-bold text-ink hover:border-brand hover:text-brand"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void remove(address.id)}
                  disabled={deleting === address.id}
                  className="press rounded-full border border-line px-2.5 py-1 text-[10px] font-bold text-ink-soft hover:border-clay hover:text-clay disabled:opacity-50"
                >
                  {deleting === address.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-[#13261d] p-4 text-cream">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-lime">Delivery area</p>
        <p className="mt-1 text-[12px] font-bold">
          We deliver to {SERVICE_AREAS.length} neighbourhoods across Brooklyn and Manhattan
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SERVICE_AREAS.map((serviceArea) => (
            <span
              key={serviceArea.postcode}
              className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-cream/80"
            >
              {serviceArea.neighbourhood} · {serviceArea.postcode}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-10 w-full rounded-xl border px-3 text-[13px] outline-none transition ${
          error ? "border-clay/60 bg-rose-soft/40" : "border-line bg-cream/40 focus:border-brand focus:bg-white"
        }`}
      />
      {error ? <p className="mt-0.5 text-[10px] font-semibold text-clay">{error}</p> : null}
    </div>
  );
}
