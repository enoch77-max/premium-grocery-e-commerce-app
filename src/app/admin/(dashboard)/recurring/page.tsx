"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import { formatMoney } from "@/lib/format";
import { roleHasPermission } from "@/lib/permissions";
import type { DemandRow } from "@/features/recurring/services/demand";

export default function RecurringDemandPage() {
  const { user } = useSession();
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/recurring/demand?days=${days}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 403 ? "no-access" : "load-failed");
      const body = (await response.json()) as { data?: { rows?: DemandRow[] } };
      setRows(body.data?.rows ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error && loadError.message === "no-access"
          ? "Your role can't open this page."
          : "We couldn't load the forecast — try again?",
      );
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const shortages = rows.filter((row) => row.shortfall > 0);
  const canAllocate = user ? roleHasPermission(user.role ?? "", "recurring.allocate") : false;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight">
            Recurring demand vs stock
          </h1>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">
            What your repeating orders will need, against what&apos;s on the shelf. Worst shortages first.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {[3, 7, 14].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              aria-pressed={days === option}
              className={`press flex h-9 items-center rounded-full px-3 text-[12px] font-bold ${
                days === option ? "bg-ink text-cream" : "border border-line bg-white text-ink-soft"
              }`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="status" className="rounded-xl border border-clay/25 bg-rose-soft/70 px-3 py-2 text-[12px] font-semibold text-clay">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((row) => (
            <div key={row} className="shimmer h-16 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-9 text-center">
          <p className="font-display text-[18px] font-semibold">No repeating demand yet</p>
          <p className="mx-auto mt-1 max-w-[320px] text-[12px] leading-relaxed text-ink-soft">
            Once customers save repeating lists, their upcoming needs show up here against stock.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line/80 bg-white">
          <table className="w-full min-w-[560px] text-left text-[12px]">
            <thead className="border-b border-line/70 bg-cream/60 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
              <tr>
                <th className="px-3 py-2 font-bold">Product</th>
                <th className="px-3 py-2 text-right font-bold">Demand</th>
                <th className="px-3 py-2 text-right font-bold">Stock</th>
                <th className="px-3 py-2 text-right font-bold">Shortfall</th>
                <th className="px-3 py-2 text-right font-bold">Lists</th>
                {canAllocate ? <th className="px-3 py-2 text-right font-bold">Act</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map((row) => (
                <tr key={row.productId} className={row.shortfall > 0 ? "bg-rose-soft/40" : undefined}>
                  <td className="px-3 py-2">
                    <span className="block font-bold text-ink">{row.name}</span>
                    <span className="text-[10px] text-ink-soft">{row.unit}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{row.demand}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.stock}</td>
                  <td
                    className={`px-3 py-2 text-right font-extrabold tabular-nums ${
                      row.shortfall > 0 ? "text-clay" : "text-ink-soft"
                    }`}
                  >
                    {row.shortfall > 0 ? `−${row.shortfall}` : "0"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{row.lists}</td>
                  {canAllocate ? (
                    <td className="px-3 py-2 text-right">
                      <Link
                        href="/admin/recurring/allocation"
                        className="press inline-flex h-8 items-center rounded-full border border-line bg-white px-2.5 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
                      >
                        Allocate
                      </Link>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && shortages.length ? (
        <p className="rounded-xl bg-amber-soft/70 px-3 py-2 text-[11.5px] font-semibold text-ink">
          {shortages.length} product{shortages.length === 1 ? "" : "s"} will run short inside {days} days. Head to
          Allocation to decide who gets what.
        </p>
      ) : null}

      <p className="text-[10.5px] text-ink-soft">
        Demand counts every scheduled occurrence inside the window (daily lists count each day). Prices shown are
        current: {rows.length ? formatMoney(rows[0].priceCents) : ""}
      </p>
    </div>
  );
}
