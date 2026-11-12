"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import { friendlyDate, friendlyTime } from "@/features/recurring/ui/copy";
import { Notice } from "@/features/recurring/ui/primitives";

type QueueRow = {
  runId: number;
  listId: number;
  listName: string;
  scheduledFor: string;
  priorityScore: number;
  decisionReason: string;
  amountCents: number;
  attemptCount: number;
};

/**
 * Manual scarce-stock allocation. Shows the automatic ranking *with the reason*
 * the scheduler recorded, then lets an authorised role jump a run ahead — every
 * override is written to the audit log with the reason typed here.
 */
export default function AllocationPage() {
  const { user, authFetch } = useSession();
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [overrideFor, setOverrideFor] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState(1000000);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/admin/recurring/allocation");
      if (response.status === 403) throw new Error("no-access");
      if (!response.ok) throw new Error("load-failed");
      const body = (await response.json()) as { data?: { queue?: QueueRow[] } };
      setQueue(body.data?.queue ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message === "no-access"
          ? "Your role can't open allocation."
          : "We couldn't load the queue — try again?",
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitOverride = async (run: QueueRow) => {
    setBusyId(run.runId);
    setMessage(null);
    setError(null);
    try {
      const response = await authFetch("/api/recurring/admin/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: run.listId, priority, reason }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "override-failed");
      setMessage(`“${run.listName}” moved in the queue. The reason is on the audit log.`);
      setOverrideFor(null);
      setReason("");
      await load();
    } catch (overrideError) {
      setError(overrideError instanceof Error ? overrideError.message : "We couldn't save that — try again?");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight">Scarce-stock allocation</h1>
        <p className="mt-0.5 text-[11.5px] text-ink-soft">
          Automatic order first (earliest time, then most consistent shoppers). Override only when you must — it&apos;s
          logged with your reason.
        </p>
      </div>

      {error ? <Notice tone="warn">{error}</Notice> : null}
      {message ? <Notice>{message}</Notice> : null}

      {loading ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1].map((row) => (
            <div key={row} className="shimmer h-20 rounded-2xl" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-9 text-center">
          <p className="font-display text-[18px] font-semibold">Nothing waiting to be allocated</p>
          <p className="mx-auto mt-1 max-w-[320px] text-[12px] leading-relaxed text-ink-soft">
            Scheduled runs appear here in priority order as soon as customers have deliveries coming up.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {queue.map((run, index) => (
            <li key={run.runId} className="rounded-2xl border border-line/80 bg-white p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-ink">
                    #{index + 1} · {run.listName}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    {friendlyDate(run.scheduledFor)} · {friendlyTime(run.scheduledFor)}
                    {run.attemptCount > 0 ? ` · attempt ${run.attemptCount + 1}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-cream-deep/70 px-2 py-0.5 text-[10px] font-extrabold tabular-nums text-ink-soft">
                  score {run.priorityScore}
                </span>
              </div>

              <p className="mt-1.5 rounded-lg bg-cream/70 px-2.5 py-1.5 text-[11px] leading-relaxed text-ink-soft">
                Why this order: {run.decisionReason || "automatic ranking"}
              </p>

              {overrideFor === run.runId ? (
                <div className="mt-2 space-y-2 rounded-xl border border-line bg-cream/60 p-3">
                  <label className="block">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                      Reason (goes on the audit log)
                    </span>
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="e.g. care-home delivery must go first"
                      className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-[13px] outline-none focus:border-brand"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                      New priority (higher runs first)
                    </span>
                    <input
                      type="number"
                      value={priority}
                      onChange={(event) => setPriority(Number(event.target.value))}
                      className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-[13px] tabular-nums outline-none focus:border-brand"
                    />
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={busyId === run.runId || reason.trim().length < 4}
                      onClick={() => void submitOverride(run)}
                      className="press flex h-10 flex-1 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-cream disabled:opacity-60"
                    >
                      Save override
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideFor(null)}
                      className="press flex h-10 items-center rounded-full border border-line bg-white px-3 text-[12px] font-bold text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOverrideFor(run.runId);
                    setPriority(run.priorityScore + 1000);
                  }}
                  className="press mt-2 flex h-9 items-center rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand"
                >
                  Override this order
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {user?.role === "seller" ? <Notice tone="warn">Sellers can view this queue but not override it.</Notice> : null}
    </div>
  );
}
