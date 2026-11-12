"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useRecurring } from "@/features/recurring/hooks/use-recurring";
import { EmptyState, Notice, RecurringSkeleton } from "@/features/recurring/ui/primitives";
import { RecurringListCard, TimelineRow } from "@/features/recurring/ui/list-card";
import { DelaySheet } from "@/features/recurring/ui/delay-sheet";
import { EMPTY_LISTS, friendlyError } from "@/features/recurring/ui/copy";
import { ArrowRightIcon, PlusIcon, RefreshIcon } from "@/components/icons";

export default function RecurringListsPage() {
  return (
    <AccountGate>
      <AccountShell>
        <RecurringHome />
      </AccountShell>
    </AccountGate>
  );
}

function RecurringHome() {
  const { data, loading, busy, timeline, itemsFor, runsFor, actions, reload } = useRecurring();
  const [delayFor, setDelayFor] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeLists = data.lists.filter((list) => list.status !== "cancelled");

  const withNotice = async (run: Promise<{ ok: boolean }>, message: string) => {
    const result = await run;
    setNotice(result.ok ? message : friendlyError("We couldn't do that just now — nothing has changed."));
    window.setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight">
            Repeating orders
          </h1>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
            Your regulars, delivered on their own. Pause or skip any time.
          </p>
        </div>
        <Link
          href="/account/recurring/new"
          className="press flex h-10 shrink-0 items-center gap-1 rounded-full bg-brand px-3.5 text-[12.5px] font-bold text-white"
        >
          <PlusIcon className="h-4 w-4" strokeWidth={2.4} /> New list
        </Link>
      </div>

      {notice ? <Notice>{notice}</Notice> : null}
      {!data.gateway.configured ? (
        <Notice tone="warn">
          Automatic card charging isn&apos;t switched on for this store yet. You can still build and save
          lists — nothing will be charged.
        </Notice>
      ) : null}

      {loading ? (
        <RecurringSkeleton rows={2} />
      ) : activeLists.length === 0 ? (
        <EmptyState
          emoji="🔁"
          title={EMPTY_LISTS.title}
          body={EMPTY_LISTS.body}
          action={
            <Link
              href="/account/recurring/new"
              className="press flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-[12.5px] font-bold text-white"
            >
              Create my first list <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {activeLists.map((list) => {
            const runs = runsFor(list.id);
            const nextRun =
              runs.find((run) => run.state === "held") ??
              runs.find((run) => run.state === "scheduled") ??
              runs[0];
            return (
              <RecurringListCard
                key={list.id}
                list={list}
                items={itemsFor(list.id)}
                nextRun={nextRun}
                busy={busy}
                onSkip={() =>
                  void withNotice(
                    actions.skip(list.id),
                    "Skipped the next delivery — back to normal after that.",
                  )
                }
                onResume={() =>
                  void withNotice(actions.resume(list.id), "Resumed. We'll deliver as usual next time.")
                }
                onPause={() => void withNotice(actions.pause(list.id), "Paused. Everything stays saved.")}
                onDelay={() => setDelayFor(list.id)}
              />
            );
          })}
        </div>
      )}

      {!loading && timeline.length ? (
        <section className="rounded-2xl border border-line/80 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <RefreshIcon className="h-3.5 w-3.5 text-brand" strokeWidth={2.2} /> Upcoming deliveries
            </h2>
            <button
              type="button"
              onClick={() => void reload()}
              className="press text-[11px] font-bold text-brand hover:underline"
            >
              Refresh
            </button>
          </div>
          <ol className="relative mt-3 border-l border-line/70 pl-0">
            {timeline.map((run) => {
              const list = data.lists.find((entry) => entry.id === run.listId);
              return (
                <TimelineRow
                  key={run.id}
                  run={run}
                  list={list}
                  onResolve={(action) =>
                    void withNotice(
                      actions.resolve(run.listId, run.id, action),
                      action === "continue_partial"
                        ? "We'll send the rest — thank you!"
                        : action === "wait"
                          ? "We'll try again next time."
                          : "Skipped this one. Your list is safe.",
                    )
                  }
                  onSkip={
                    list ? () => void withNotice(actions.skip(list.id), "Skipped that delivery.") : undefined
                  }
                  onDelay={list ? () => setDelayFor(list.id) : undefined}
                />
              );
            })}
          </ol>
        </section>
      ) : null}

      <DelaySheet
        open={delayFor !== null}
        busy={busy?.startsWith("delay:") ?? false}
        currentNext={data.lists.find((list) => list.id === delayFor)?.nextRunAt ?? null}
        onClose={() => setDelayFor(null)}
        onConfirm={(date) => {
          if (delayFor === null) return;
          void withNotice(actions.delay(delayFor, date), "Moved. We'll deliver on the day you picked.");
          setDelayFor(null);
        }}
      />
    </div>
  );
}
