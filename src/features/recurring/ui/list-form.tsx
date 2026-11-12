"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { formatMoney } from "@/lib/format";
import type { Cadence, ShortagePolicy } from "@/features/recurring/types";
import {
  CadencePicker,
  Notice,
  PromiseStrip,
  ShortagePicker,
  TimePicker,
} from "@/features/recurring/ui/primitives";
import { CatalogPicker, SelectedItemRows, type PickedItem } from "@/features/recurring/ui/catalog-picker";
import { PaymentSetup } from "@/features/recurring/ui/payment-setup";
import type { GatewayStatus, RecurringItem, RecurringList } from "@/features/recurring/hooks/use-recurring";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

/**
 * Create/edit form for a recurring list.
 *
 * Deliberately short: items (one search box), cadence (3 taps), time (chip + native
 * picker), shortage preference (plain words), consent tick, save. Cart-style
 * steppers instead of numeric inputs keep it thumb-friendly on phones.
 */
export function ListForm({
  mode,
  list,
  initialItems,
  paymentMethodId,
  gateway,
  onSaved,
}: {
  mode: "create" | "edit";
  list?: RecurringList;
  initialItems?: RecurringItem[];
  paymentMethodId?: number;
  gateway: GatewayStatus;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const { authFetch, refresh } = useSession();

  const [name, setName] = useState(list?.name ?? "My weekly shop");
  const [items, setItems] = useState<PickedItem[]>(
    (initialItems ?? []).map((item) => ({ productId: item.productId, quantity: item.quantity })),
  );
  const [cadence, setCadence] = useState<Cadence>((list?.cadence as Cadence) ?? "weekly");
  const [localTime, setLocalTime] = useState(list?.localTime ?? "08:00");
  const [policy, setPolicy] = useState<ShortagePolicy>((list?.shortagePolicy as ShortagePolicy) ?? "partial");
  const [consent, setConsent] = useState(Boolean(list?.consentAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setTimezone("UTC");
    }
  }, []);

  const [methods, setMethods] = useState<Array<{ id: number; last4: string; brand: string }>>([]);
  const [methodId, setMethodId] = useState<number | undefined>(paymentMethodId);
  const [methodsBusy, setMethodsBusy] = useState(true);

  const loadMethods = useCallback(async () => {
    try {
      const response = await authFetch("/api/recurring/payment-methods");
      if (!response.ok) return;
      const body = (await response.json()) as {
        methods?: Array<{ id: number; last4: string; brand: string }>;
      };
      const list = body.methods ?? [];
      setMethods(list);
      setMethodId((current) => current ?? list[0]?.id);
    } finally {
      setMethodsBusy(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const estimate = useMemo(() => {
    if (!items.length) return null;
    const priced = items.every((item) => typeof item.unitPriceCents === "number");
    if (!priced) return null;
    return items.reduce((sum, item) => sum + (item.unitPriceCents ?? 0) * item.quantity, 0);
  }, [items]);
  // With a gateway, a saved card is mandatory. Without one, the backend cannot
  // auto-charge anyway, so we let the list be saved as a plain shopping list.
  const requiresCard = gateway.configured;
  const canSave =
    items.length > 0 && name.trim().length >= 2 && consent && !busy && (!requiresCard || Boolean(methodId));

  const save = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const payload = {
        name: name.trim(),
        cadence,
        localTime,
        timezone,
        shortagePolicy: policy,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      };

      const response =
        mode === "create"
          ? await authFetch("/api/recurring/lists", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, paymentMethodId: methodId, consent }),
            })
          : await authFetch(`/api/recurring/lists/${list?.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "update", ...payload }),
            });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        errors?: Record<string, string>;
        list?: { id: number };
      } | null;

      if (!response.ok) {
        setFieldErrors(body?.errors ?? {});
        setError(
          mode === "create"
            ? "We couldn't set that up just now. Nothing has been charged — mind checking the highlighted bits?"
            : "We couldn't save those changes. Nothing has been charged — try again?",
        );
        return;
      }

      await refresh();
      onSaved?.();
      router.push("/account/recurring");
    } catch {
      setError("The connection wobbled. Nothing has been charged — want to try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {error ? <Notice tone="warn">{error}</Notice> : null}

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <label htmlFor="list-name" className="text-[13px] font-bold text-ink">
          What should we call it?
        </label>
        <input
          id="list-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="My weekly shop"
          className={`mt-2 h-11 w-full rounded-xl border bg-cream/40 px-3 text-[15px] font-semibold text-ink outline-none focus:border-brand focus:bg-white sm:text-[13px] ${
            fieldErrors.name ? "border-clay" : "border-line"
          }`}
        />
      </section>

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold text-ink">What goes in it?</h2>
          {totalQuantity > 0 ? (
            <span className="text-[11px] font-semibold text-brand-deep">
              {totalQuantity} item{totalQuantity === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        {items.length ? (
          <div className="mt-2">
            <SelectedItemRows items={items} onChange={setItems} />
          </div>
        ) : null}
        <div className="mt-2">
          <CatalogPicker selected={items} onChange={setItems} />
        </div>
        {fieldErrors.items ? (
          <p className="mt-1 text-[11px] font-semibold text-clay">{fieldErrors.items}</p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-line/80 bg-white p-4">
        <CadencePicker value={cadence} onChange={setCadence} />
        <TimePicker value={localTime} onChange={setLocalTime} timezone={timezone} />
        <ShortagePicker value={policy} onChange={setPolicy} />
      </section>

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <h2 className="text-[13px] font-bold text-ink">Which card?</h2>
        {methodsBusy ? (
          <div className="mt-2 shimmer h-11 rounded-xl" aria-hidden />
        ) : methods.length ? (
          <div className="mt-2 space-y-1.5" role="radiogroup" aria-label="Payment method">
            {methods.map((method) => {
              const active = methodId === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethodId(method.id)}
                  className={`press flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left ${
                    active ? "border-brand bg-brand-soft/50" : "border-line/80 bg-white"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      active ? "border-brand bg-brand text-white" : "border-line"
                    }`}
                    aria-hidden
                  >
                    {active ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="text-[12.5px] font-bold capitalize text-ink">
                    {method.brand || "card"} •••• {method.last4 || "····"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
            No saved card yet — add one below and it&apos;ll be used for every delivery.
          </p>
        )}
      </section>

      <PaymentSetup
        gateway={gateway}
        onSaved={async () => {
          await loadMethods();
          await refresh();
        }}
      />

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#0f7a4d]"
            aria-describedby="consent-detail"
          />
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold text-ink">
              Yes, charge my saved card automatically for each delivery
            </span>
            <span id="consent-detail" className="mt-0.5 block text-[11px] leading-relaxed text-ink-soft">
              We&apos;ll only charge for what we actually pack, and you can pause or cancel any time. We
              record the date you agreed.
            </span>
          </span>
        </label>
        {fieldErrors.consent ? (
          <p className="mt-1 text-[11px] font-semibold text-clay">{fieldErrors.consent}</p>
        ) : null}
        {fieldErrors.paymentMethodId ? (
          <p className="mt-1 text-[11px] font-semibold text-clay">{fieldErrors.paymentMethodId}</p>
        ) : null}
      </section>

      <PromiseStrip />

      {items.length ? (
        <p className="text-center text-[11.5px] leading-relaxed text-ink-soft">
          {estimate !== null ? (
            <>
              About <strong className="text-ink">{formatMoney(estimate)}</strong> per delivery at today&apos;s
              prices.
            </>
          ) : null}{" "}
          We confirm the exact total each time before charging, and prices can change.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={!canSave}
        className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-[13.5px] font-bold text-white shadow-[0_14px_28px_-16px_rgba(15,122,77,0.9)] disabled:opacity-60"
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <CheckIcon className="h-4 w-4" strokeWidth={3} />
        )}
        {busy ? "Saving…" : mode === "create" ? "Save my repeating order" : "Save changes"}
      </button>

      <button
        type="button"
        onClick={() => router.push("/account/recurring")}
        className="press flex h-10 w-full items-center justify-center gap-1 rounded-full text-[12px] font-bold text-ink-soft"
      >
        Not now <ArrowRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
