"use client";

import { useState } from "react";
import type { StoreSettings } from "@/lib/admin";

export function SettingsForm({ initialSettings }: { initialSettings: StoreSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [deliveryFee, setDeliveryFee] = useState((initialSettings.deliveryFeeCents / 100).toFixed(2));
  const [threshold, setThreshold] = useState((initialSettings.freeDeliveryThresholdCents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(patch: Partial<StoreSettings>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; data?: { settings: StoreSettings } };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      if (data.data?.settings) setSettings(data.data.settings);
      setMessage("Settings saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-bold">Store availability</h2>
            <p className="text-[11px] text-ink-soft">Pausing blocks new checkouts while keeping the shop browsable.</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save({ storeOpen: !settings.storeOpen })}
            className={`press h-8 w-16 shrink-0 rounded-full text-[11px] font-bold ${
              settings.storeOpen ? "bg-brand text-white" : "bg-clay text-white"
            }`}
            aria-pressed={settings.storeOpen}
          >
            {settings.storeOpen ? "Open" : "Paused"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-[13px] font-bold">Announcement bar</h2>
        <input
          value={settings.announcement}
          onChange={(event) => setSettings({ ...settings, announcement: event.target.value })}
          maxLength={90}
          className="mt-2 h-11 w-full rounded-xl border border-line bg-cream/40 px-3 text-[15px] outline-none focus:border-brand focus:bg-white sm:text-[13px]"
        />
        <p className="mt-1 text-[10.5px] text-ink-soft">Shown at the top of every storefront page.</p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-[13px] font-bold">Delivery pricing</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Delivery fee ($)</span>
            <input value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} inputMode="decimal" className="h-11 w-full rounded-xl border border-line bg-cream/40 px-3 text-[15px] sm:text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">Free over ($)</span>
            <input value={threshold} onChange={(event) => setThreshold(event.target.value)} inputMode="decimal" className="h-11 w-full rounded-xl border border-line bg-cream/40 px-3 text-[15px] sm:text-[13px]" />
          </label>
        </div>
        <p className="mt-1 text-[10.5px] text-ink-soft">
          These values are recorded now and will be wired into live basket pricing in the next release.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-[13px] font-bold">Support email</h2>
        <input
          value={settings.supportEmail}
          onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })}
          type="email"
          className="mt-2 h-11 w-full rounded-xl border border-line bg-cream/40 px-3 text-[15px] outline-none focus:border-brand focus:bg-white sm:text-[13px]"
        />
      </section>

      {message ? <p className="rounded-xl bg-brand-soft/60 px-3 py-2 text-[12px] font-semibold text-brand-deep">{message}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void save({
            announcement: settings.announcement,
            supportEmail: settings.supportEmail,
            deliveryFeeCents: Math.max(0, Math.round(Number(deliveryFee) * 100) || 0),
            freeDeliveryThresholdCents: Math.max(0, Math.round(Number(threshold) * 100) || 0),
          })
        }
        className="press flex h-12 w-full items-center justify-center rounded-full bg-brand text-[13.5px] font-bold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
