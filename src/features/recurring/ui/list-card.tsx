"use client";

import Link from "next/link";
import { useState } from "react";
import type { RecurringList, RecurringItem, RecurringRun } from "@/features/recurring/hooks/use-recurring";
import {
  CADENCE_COPY,
  friendlyDate,
  friendlyTime,
  RUN_STATE_COPY,
  scheduleSentence,
} from "@/features/recurring/ui/copy";
import { Notice } from "@/features/recurring/ui/primitives";
import { ChevronRightIcon, MinusIcon, PauseIcon, PlusIcon, RefreshIcon } from "@/components/icons";

/**
 * One recurring list. Primary actions are on the card (skip / pause) so the two
 * most common jobs need exactly one tap — no detail page detour.
 */
export function RecurringListCard({
  list,
  items,
  nextRun,
  busy,
  onSkip,
  onResume,
  onPause,
  onDelay,
}: {
  list: RecurringList;
  items: RecurringItem[];
  nextRun?: RecurringRun;
  busy: string | null;
  onSkip: () => void;
  onResume: () => void;
  onPause: () => void;
  onDelay: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const paused = list.status === "paused";
  const cancelled = list.status === "cancelled";
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        paused
          ? "border-amber/40 bg-amber-soft/40"
          : cancelled
            ? "border-line bg-cream/60"
            : "border-line/80 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[17px] font-semibold leading-tight text-ink">
            {list.name}
          </h3>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">
            {scheduleSentence(list.cadence, list.localTime, list.timezone)} · {itemCount} item
            {itemCount === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
            cancelled
              ? "bg-cream-deep text-ink-soft"
              : paused
                ? "bg-amber-soft text-[#8a5a08]"
                : "bg-brand-soft text-brand-deep"
          }`}
        >
          {cancelled ? "Cancelled" : paused ? "Paused" : "Active"}
        </span>
      </div>

      {list.nextRunAt && !cancelled ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-cream/70 px-2 py-1 text-[11px] font-semibold text-ink">
          <RefreshIcon className="h-3.5 w-3.5 text-brand" strokeWidth={2.2} />
          {paused ? "Resumes" : "Next delivery"} {friendlyDate(list.nextRunAt)} ·{" "}
          {friendlyTime(list.nextRunAt)}
          {list.skipNextAt ? <span className="text-clay">· skipping next</span> : null}
        </p>
      ) : null}

      {paused ? (
        <div className="mt-2">
          <Notice tone="warn">
            Paused — everything is saved.{" "}
            {list.pausedReason?.startsWith("payment_")
              ? "Your card needs a quick look."
              : "Resume whenever you like."}
          </Notice>
        </div>
      ) : null}

      {nextRun?.state === "held" ? (
        <div className="mt-2">
          <Notice tone="warn">Waiting on you — nothing has been charged.</Notice>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {!cancelled && !paused ? (
          <>
            <button
              type="button"
              onClick={onSkip}
              disabled={busy === `skip:${list.id}`}
              className="press flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-60"
            >
              Skip once
            </button>
            <button
              type="button"
              onClick={onDelay}
              className="press flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand"
            >
              Delay
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy === `pause:${list.id}`}
              className="press flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink-soft hover:border-amber hover:text-[#8a5a08] disabled:opacity-60"
            >
              <PauseIcon className="h-3.5 w-3.5" /> Pause
            </button>
          </>
        ) : null}

        {paused && !cancelled ? (
          <button
            type="button"
            onClick={onResume}
            disabled={busy === `resume:${list.id}`}
            className="press flex h-9 items-center gap-1 rounded-full bg-brand px-3.5 text-[11.5px] font-bold text-white disabled:opacity-60"
          >
            Resume
          </button>
        ) : null}

        <Link
          href={`/account/recurring/${list.id}`}
          className="press ml-auto flex h-9 items-center gap-0.5 rounded-full px-2 text-[11.5px] font-bold text-brand hover:underline"
        >
          {paused ? "Edit list" : "Manage"} <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {confirming ? (
        <div
          className="mt-2 rounded-xl border border-line bg-cream/70 p-3"
          role="dialog"
          aria-label="Pause this list"
        >
          <p className="text-[12px] font-bold text-ink">Pause “{list.name}”?</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
            It stays saved with all your items. Nothing will be charged while it&apos;s paused.
          </p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onPause();
              }}
              className="press flex h-9 flex-1 items-center justify-center rounded-full bg-ink text-[11.5px] font-bold text-cream"
            >
              Yes, pause it
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="press flex h-9 items-center justify-center rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink"
            >
              Keep going
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

/** Compact run row for the upcoming timeline. */
export function TimelineRow({
  run,
  list,
  onResolve,
  onSkip,
  onDelay,
}: {
  run: RecurringRun;
  list?: RecurringList;
  onResolve: (action: "continue_partial" | "wait" | "cancel") => void;
  onSkip?: () => void;
  onDelay?: () => void;
}) {
  const copy = RUN_STATE_COPY[run.state as keyof typeof RUN_STATE_COPY] ?? RUN_STATE_COPY.scheduled;
  const isHeld = run.state === "held";

  return (
    <li className="relative pl-7">
      <span
        className={`absolute left-0 top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 ${
          isHeld
            ? "border-amber bg-amber-soft"
            : run.state === "confirmed" || run.state === "partially_fulfilled"
              ? "border-brand bg-brand"
              : "border-line bg-white"
        }`}
        aria-hidden
      >
        {(run.state === "confirmed" || run.state === "partially_fulfilled") && (
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        )}
      </span>
      <div className="pb-4">
        <p className="text-[12.5px] font-bold text-ink">
          {friendlyDate(run.scheduledFor)} · {friendlyTime(run.scheduledFor)}
          {list ? <span className="font-normal text-ink-soft"> · {list.name}</span> : null}
        </p>
        <p className={`mt-0.5 text-[11.5px] ${isHeld ? "font-semibold text-clay" : "text-ink-soft"}`}>
          {copy.label} — {copy.note}
        </p>

        {isHeld && list ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onResolve("continue_partial")}
              className="press flex h-9 items-center rounded-full bg-brand px-3 text-[11.5px] font-bold text-white"
            >
              Send the rest
            </button>
            <button
              type="button"
              onClick={() => onResolve("wait")}
              className="press flex h-9 items-center rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink"
            >
              Wait for next time
            </button>
            <button
              type="button"
              onClick={() => onResolve("cancel")}
              className="press flex h-9 items-center rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink-soft hover:border-clay hover:text-clay"
            >
              Skip this one
            </button>
          </div>
        ) : null}

        {run.state === "scheduled" && run.id > 0 && onSkip && onDelay ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onSkip}
              className="press flex h-8 items-center rounded-full border border-line bg-white px-2.5 text-[11px] font-bold text-ink hover:border-brand"
            >
              <MinusIcon className="mr-1 h-3 w-3" /> Skip
            </button>
            <button
              type="button"
              onClick={onDelay}
              className="press flex h-8 items-center rounded-full border border-line bg-white px-2.5 text-[11px] font-bold text-ink hover:border-brand"
            >
              <PlusIcon className="mr-1 h-3 w-3" /> Delay
            </button>
          </div>
        ) : null}

        {run.priceChanged ? (
          <p className="mt-1 text-[10.5px] font-semibold text-clay">
            A price changed since you built this list — we charged today&apos;s price.
          </p>
        ) : null}
      </div>
    </li>
  );
}

export { CADENCE_COPY };
