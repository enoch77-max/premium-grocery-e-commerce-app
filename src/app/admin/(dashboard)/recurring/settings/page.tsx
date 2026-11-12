"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import { roleHasPermission } from "@/lib/permissions";
import { Notice } from "@/features/recurring/ui/primitives";

const ROLES = [
  { id: "admin", label: "Admins", note: "Everything, including these settings" },
  { id: "manager", label: "Managers", note: "Day-to-day running of the store" },
  { id: "stock_manager", label: "Stock managers", note: "Buying, stock and allocation" },
  { id: "seller", label: "Sellers", note: "Read-only demand view" },
];

export default function RecurringSettingsPage() {
  const { user, authFetch } = useSession();
  const [leadDays, setLeadDays] = useState(1);
  const [roles, setRoles] = useState<string[]>(["admin", "stock_manager"]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user ? roleHasPermission(user.role ?? "", "recurring.settings") : false;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await authFetch("/api/admin/recurring/settings");
        if (!response.ok) throw new Error();
        const body = (await response.json()) as { data?: { shortageLeadDays?: number; alertRoles?: string[] } };
        if (cancelled) return;
        setLeadDays(body.data?.shortageLeadDays ?? 1);
        setRoles(body.data?.alertRoles ?? ["admin", "stock_manager"]);
      } catch {
        if (!cancelled) setError("We couldn't load these settings — try again?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await authFetch("/api/admin/recurring/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortageLeadDays: leadDays, alertRoles: roles }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "save-failed");
      setMessage("Saved. Shortage alerts will use the new lead time from the next check.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save — try again?");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="shimmer h-24 rounded-2xl" />
        <div className="shimmer h-40 rounded-2xl" />
      </div>
    );
  }

  if (!canEdit) {
    return <Notice tone="warn">Your role can view demand but not change these settings.</Notice>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight">Shortage alerts</h1>
        <p className="mt-0.5 text-[11.5px] text-ink-soft">
          How early we look ahead for shortages, and who hears about them.
        </p>
      </div>

      {error ? <Notice tone="warn">{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <h2 className="text-[13px] font-bold text-ink">Look ahead by</h2>
        <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Shortage lead time">
          {[1, 2, 3].map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={leadDays === option}
              onClick={() => setLeadDays(option)}
              className={`press flex h-10 flex-1 flex-col items-center justify-center rounded-xl border-2 text-[12px] font-bold ${
                leadDays === option ? "border-brand bg-brand-soft/60 text-ink" : "border-line/80 bg-white text-ink-soft"
              }`}
            >
              {option} day{option === 1 ? "" : "s"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
          We check stock this far ahead of every delivery and warn the roles below before a customer notices.
        </p>
      </section>

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <h2 className="text-[13px] font-bold text-ink">Who gets shortage alerts</h2>
        <div className="mt-2 space-y-1.5">
          {ROLES.map((role) => {
            const active = roles.includes(role.id);
            return (
              <button
                key={role.id}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() =>
                  setRoles((current) =>
                    active ? current.filter((entry) => entry !== role.id) : [...current, role.id],
                  )
                }
                className={`press flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left ${
                  active ? "border-brand bg-brand-soft/50" : "border-line/80 bg-white"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${
                    active ? "border-brand bg-brand text-white" : "border-line"
                  }`}
                  aria-hidden
                >
                  {active ? "✓" : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-ink">{role.label}</span>
                  <span className="block text-[10.5px] text-ink-soft">{role.note}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy || !roles.length}
        className="press flex h-12 w-full items-center justify-center rounded-full bg-brand text-[13.5px] font-bold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save alert settings"}
      </button>
    </div>
  );
}
