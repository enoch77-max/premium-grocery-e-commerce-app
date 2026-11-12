"use client";

import { useCallback, useEffect, useState } from "react";
import { Notice } from "@/features/recurring/ui/primitives";

type EventRow = {
  id: number;
  runId: number | null;
  listId: number;
  fromState: string | null;
  toState: string;
  reason: string;
  actor: string;
  detail: string;
  createdAt: string;
  orderNumber: string | null;
};

type AdminEntry = {
  id: number;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  createdAt: string;
};

const KINDS = [
  { id: "all", label: "Everything" },
  { id: "orders", label: "Orders" },
  { id: "reservations", label: "Reservations" },
  { id: "charges", label: "Charges" },
  { id: "retries", label: "Retries" },
  { id: "overrides", label: "Overrides" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

/** Searchable trail of orders, reservations, charges, retries and overrides. */
export default function AuditPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [adminEntries, setAdminEntries] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (kind !== "all") params.set("kind", kind);
      const response = await fetch(`/api/admin/recurring/audit?${params}`, { cache: "no-store" });
      if (response.status === 403) throw new Error("no-access");
      if (!response.ok) throw new Error("load-failed");
      const body = (await response.json()) as { data?: { events?: EventRow[]; adminEntries?: AdminEntry[] } };
      setEvents(body.data?.events ?? []);
      setAdminEntries(body.data?.adminEntries ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message === "no-access"
          ? "Your role can't open the audit log."
          : "We couldn't load the log — try again?",
      );
    } finally {
      setLoading(false);
    }
  }, [kind, query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight">Audit log</h1>
        <p className="mt-0.5 text-[11.5px] text-ink-soft">
          Every state change, charge attempt, retry and manual override — searchable.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search reasons, actors, order numbers…"
          aria-label="Search the audit log"
          className="h-10 min-w-0 flex-1 rounded-full border border-line bg-white px-3.5 text-[13px] outline-none focus:border-brand"
        />
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {KINDS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setKind(option.id)}
              aria-pressed={kind === option.id}
              className={`press flex h-9 shrink-0 items-center rounded-full px-3 text-[11.5px] font-bold ${
                kind === option.id ? "bg-ink text-cream" : "border border-line bg-white text-ink-soft"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <Notice tone="warn">{error}</Notice> : null}

      {loading ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((row) => (
            <div key={row} className="shimmer h-14 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 && adminEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-9 text-center">
          <p className="font-display text-[18px] font-semibold">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-[320px] text-[12px] leading-relaxed text-ink-soft">
            As soon as deliveries run, charge or get overridden, every step lands in this log.
          </p>
        </div>
      ) : (
        <ol className="space-y-1.5">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border border-line/80 bg-white px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="min-w-0 text-[12px] font-bold text-ink">
                  {event.fromState ? `${event.fromState} → ` : ""}
                  {event.toState}
                  {event.orderNumber ? <span className="ml-1.5 text-ink-soft">#{event.orderNumber}</span> : null}
                </p>
                <span className="shrink-0 text-[10px] tabular-nums text-ink-soft">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">{event.reason}</p>
              <p className="text-[10px] text-ink-soft/80">by {event.actor}</p>
            </li>
          ))}
          {adminEntries.map((entry) => (
            <li key={`admin-${entry.id}`} className="rounded-xl border border-line/80 bg-cream/60 px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="min-w-0 text-[12px] font-bold text-ink">
                  {entry.action} <span className="text-ink-soft">{entry.entity} #{entry.entityId}</span>
                </p>
                <span className="shrink-0 text-[10px] tabular-nums text-ink-soft">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">{entry.detail}</p>
              <p className="text-[10px] text-ink-soft/80">by {entry.actorEmail}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
