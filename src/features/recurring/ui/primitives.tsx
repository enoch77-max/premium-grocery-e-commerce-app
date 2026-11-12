"use client";

import type { ReactNode } from "react";
import { CADENCE, SHORTAGE_POLICY, type Cadence, type ShortagePolicy } from "@/features/recurring/types";
import { CADENCE_COPY, SHORTAGE_COPY } from "@/features/recurring/ui/copy";
import { CheckIcon, SparkleIcon } from "@/components/icons";

/** Skeleton block matching the site's shimmer utility. */
export function RecurringSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="shimmer h-28 rounded-2xl" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="shimmer h-20 rounded-2xl" />
      ))}
    </div>
  );
}

/** Friendly empty state — never a dead end: always one clear next step. */
export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-9 text-center">
      <div
        className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-2xl"
        aria-hidden
      >
        {emoji}
      </div>
      <h2 className="mt-3 font-display text-[20px] font-semibold leading-tight text-ink">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-ink-soft">{body}</p>
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Inline gentle error/notice. role=status so screen readers announce it. */
export function Notice({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  const styles =
    tone === "warn"
      ? "border-clay/25 bg-rose-soft/70 text-clay"
      : "border-brand/20 bg-brand-soft/60 text-brand-deep";
  return (
    <p
      role="status"
      className={`rounded-xl border px-3 py-2 text-[12px] font-semibold leading-relaxed ${styles}`}
    >
      {children}
    </p>
  );
}

/** Daily / weekly / monthly — three large tap targets, no dropdown. */
export function CadencePicker({ value, onChange }: { value: Cadence; onChange: (value: Cadence) => void }) {
  return (
    <fieldset>
      <legend className="text-[13px] font-bold text-ink">How often?</legend>
      <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="How often">
        {CADENCE.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className={`press flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-2 py-2 text-center transition ${
                active ? "border-brand bg-brand-soft/60" : "border-line/80 bg-white hover:border-brand/40"
              }`}
            >
              <span className="text-[12.5px] font-bold text-ink">{CADENCE_COPY[option].short}</span>
              <span className="text-[10px] text-ink-soft">{CADENCE_COPY[option].every}</span>
              {active ? <CheckIcon className="mt-0.5 h-3 w-3 text-brand" strokeWidth={3} /> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Time-of-day picker with quick chips, plus the list's timezone. */
export function TimePicker({
  value,
  onChange,
  timezone,
}: {
  value: string;
  onChange: (value: string) => void;
  timezone: string;
}) {
  const presets = ["07:00", "08:00", "12:00", "18:00"];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="recurring-time" className="text-[13px] font-bold text-ink">
          What time?
        </label>
        <span className="text-[10.5px] text-ink-soft">{timezone.replace(/_/g, " ")}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            aria-pressed={value === preset}
            className={`press flex h-9 items-center rounded-full px-3 text-[12px] font-semibold transition ${
              value === preset ? "bg-ink text-cream" : "border border-line bg-white text-ink-soft"
            }`}
          >
            {preset}
          </button>
        ))}
        <input
          id="recurring-time"
          type="time"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Delivery time"
          className="h-9 rounded-full border border-line bg-white px-3 text-[12px] font-semibold text-ink"
        />
      </div>
    </div>
  );
}

/** "If something's missing, I'd like…" — plain words, three options. */
export function ShortagePicker({
  value,
  onChange,
}: {
  value: ShortagePolicy;
  onChange: (value: ShortagePolicy) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[13px] font-bold text-ink">{SHORTAGE_COPY.partial.question}</legend>
      <div className="mt-2 space-y-1.5" role="radiogroup" aria-label={SHORTAGE_COPY.partial.question}>
        {SHORTAGE_POLICY.map((option) => {
          const active = value === option;
          const copy = SHORTAGE_COPY[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className={`press flex w-full items-start gap-2.5 rounded-xl border-2 p-3 text-left transition ${
                active ? "border-brand bg-brand-soft/50" : "border-line/80 bg-white hover:border-brand/40"
              }`}
            >
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                  active ? "border-brand bg-brand text-white" : "border-line"
                }`}
                aria-hidden
              >
                {active ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-bold text-ink">{copy.answer}</span>
                <span className="block text-[11px] leading-relaxed text-ink-soft">{copy.detail}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Reassuring strip used on create/edit screens. */
export function PromiseStrip() {
  return (
    <p className="flex items-start gap-1.5 rounded-xl bg-cream-deep/60 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
      <SparkleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
      You can pause, skip or change anything any time. Nothing is charged until we actually pack your order.
    </p>
  );
}
