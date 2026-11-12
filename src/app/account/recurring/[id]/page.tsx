"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useRecurring } from "@/features/recurring/hooks/use-recurring";
import { ListForm } from "@/features/recurring/ui/list-form";
import { TimelineRow } from "@/features/recurring/ui/list-card";
import { DelaySheet } from "@/features/recurring/ui/delay-sheet";
import { EmptyState, Notice, RecurringSkeleton } from "@/features/recurring/ui/primitives";
import { friendlyError, scheduleSentence } from "@/features/recurring/ui/copy";
import { ChevronLeftIcon } from "@/components/icons";
import { formatMoney } from "@/lib/format";

export default function RecurringListDetailPage() {
  return (
    <AccountGate>
      <AccountShell>
        <ListDetail />
      </AccountShell>
    </AccountGate>
  );
}

function ListDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listId = Number(params.id);
  const { data, loading, busy, itemsFor, runsFor, actions, reload } = useRecurring();
  const [notice, setNotice] = useState<string | null>(null);
  const [delayOpen, setDelayOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const list = data.lists.find((entry) => entry.id === listId);

  const act = async (run: Promise<{ ok: boolean }>, message: string) => {
    const result = await run;
    setNotice(result.ok ? message : friendlyError("We couldn't do that just now — nothing has changed."));
    window.setTimeout(() => setNotice(null), 4000);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="shimmer h-8 w-40 rounded-lg" />
        <RecurringSkeleton rows={3} />
      </div>
    );
  }

  if (!list) {
    return (
      <EmptyState
        emoji="🧺"
        title="We couldn't find that list"
        body="It may have been cancelled. Your other lists are safe."
        action={
          <Link
            href="/account/recurring"
            className="press flex h-10 items-center rounded-full bg-brand px-4 text-[12.5px] font-bold text-white"
          >
            Back to repeating orders
          </Link>
        }
      />
    );
  }

  const items = itemsFor(list.id);
  const runs = runsFor(list.id);

  if (editing) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="press inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-soft hover:text-brand"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" /> Back
        </button>
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight">
          Edit “{list.name}”
        </h1>
        <ListForm
          mode="edit"
          list={list}
          initialItems={items.map((item) => ({ ...item }))}
          paymentMethodId={list.paymentMethodId}
          gateway={data.gateway}
          onSaved={() => void reload()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => router.push("/account/recurring")}
        className="press inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-soft hover:text-brand"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" /> Repeating orders
      </button>

      {notice ? <Notice>{notice}</Notice> : null}

      <section className="rounded-2xl border border-line/80 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate font-display text-[20px] font-semibold leading-tight">{list.name}</h1>
            <p className="mt-0.5 text-[11.5px] text-ink-soft">
              {scheduleSentence(list.cadence, list.localTime, list.timezone)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
              list.status === "paused"
                ? "bg-amber-soft text-[#8a5a08]"
                : list.status === "cancelled"
                  ? "bg-cream-deep text-ink-soft"
                  : "bg-brand-soft text-brand-deep"
            }`}
          >
            {list.status}
          </span>
        </div>

        <ul className="mt-3 divide-y divide-line/60">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
              <span className="min-w-0 truncate text-ink">{item.name ?? `Item #${item.productId}`}</span>
              <span className="shrink-0 font-bold text-ink-soft">
                ×{item.quantity}
                {item.priceCents ? (
                  <span className="ml-1.5 font-semibold text-ink">
                    {formatMoney(item.priceCents * item.quantity)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={list.status === "cancelled"}
            className="press flex h-9 items-center rounded-full bg-ink px-3.5 text-[11.5px] font-bold text-cream disabled:opacity-50"
          >
            Edit items & schedule
          </button>
          {list.status === "active" ? (
            <button
              type="button"
              onClick={() => void act(actions.pause(list.id), "Paused. Everything stays saved.")}
              className="press flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-[11.5px] font-bold text-ink"
            >
              Pause
            </button>
          ) : null}
          {list.status === "paused" ? (
            <button
              type="button"
              onClick={() => void act(actions.resume(list.id), "Resumed. We'll deliver as usual.")}
              className="press flex h-9 items-center rounded-full bg-brand px-3.5 text-[11.5px] font-bold text-white"
            >
              Resume
            </button>
          ) : null}
          {list.status !== "cancelled" ? (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="press flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-[11.5px] font-bold text-ink-soft hover:border-clay hover:text-clay"
            >
              Cancel list
            </button>
          ) : null}
        </div>

        {confirmCancel ? (
          <div
            className="mt-2 rounded-xl border border-clay/25 bg-rose-soft/60 p-3"
            role="dialog"
            aria-label="Cancel list"
          >
            <p className="text-[12px] font-bold text-ink">Cancel “{list.name}” for good?</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
              Nothing more will be delivered or charged. If you only need a break, pausing keeps everything
              saved.
            </p>
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmCancel(false);
                  void act(actions.cancel(list.id), "Cancelled. Nothing more will be charged.");
                }}
                className="press flex h-9 flex-1 items-center justify-center rounded-full bg-clay text-[11.5px] font-bold text-white"
              >
                Yes, cancel it
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCancel(false);
                  void act(actions.pause(list.id), "Paused instead — everything saved.");
                }}
                className="press flex h-9 items-center justify-center rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink"
              >
                Pause instead
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {runs.length ? (
        <section className="rounded-2xl border border-line/80 bg-white p-4">
          <h2 className="text-[13px] font-bold text-ink">Deliveries</h2>
          <ol className="relative mt-3 border-l border-line/70">
            {runs.slice(0, 8).map((run) => (
              <TimelineRow
                key={run.id}
                run={run}
                list={list}
                onResolve={(action) =>
                  void act(
                    actions.resolve(list.id, run.id, action),
                    action === "continue_partial"
                      ? "We'll send the rest — thank you!"
                      : action === "wait"
                        ? "We'll try again next time."
                        : "Skipped this one.",
                  )
                }
                onSkip={() => void act(actions.skip(list.id), "Skipped that delivery.")}
                onDelay={() => setDelayOpen(true)}
              />
            ))}
          </ol>
        </section>
      ) : null}

      <DelaySheet
        open={delayOpen}
        busy={busy?.startsWith("delay:") ?? false}
        currentNext={list.nextRunAt}
        onClose={() => setDelayOpen(false)}
        onConfirm={(date) => {
          void act(actions.delay(list.id, date), "Moved. We'll deliver on the day you picked.");
          setDelayOpen(false);
        }}
      />
    </div>
  );
}
