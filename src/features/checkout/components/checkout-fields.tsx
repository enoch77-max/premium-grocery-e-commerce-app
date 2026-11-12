"use client";

import { BoltIcon, MoonIcon, SunIcon, CardIcon, CashIcon, WalletIcon } from "@/components/icons";

export function FormCard({
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

export function Field({
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
      <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        {label}
      </label>
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

export function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <span className={accent ? "font-bold text-brand" : "font-semibold text-ink"}>{value}</span>
    </div>
  );
}

export function SlotIcon({ name }: { name: string }) {
  if (name === "bolt") return <BoltIcon className="h-3 w-3 text-amber" />;
  if (name === "moon") return <MoonIcon className="h-3 w-3 text-ink-soft" />;
  return <SunIcon className="h-3 w-3 text-amber" />;
}

export function PaymentIcon({ name }: { name: string }) {
  if (name === "wallet") return <WalletIcon className="h-4 w-4" />;
  if (name === "cash") return <CashIcon className="h-4 w-4" />;
  return <CardIcon className="h-4 w-4" />;
}
