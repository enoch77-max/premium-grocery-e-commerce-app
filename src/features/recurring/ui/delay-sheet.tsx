"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { CalendarIcon, CheckIcon } from "@/components/icons";
import { friendlyDate } from "@/features/recurring/ui/copy";

/**
 * Delay picker with the three shortcuts the brief asks for:
 * later today, this weekday next week, or any date. One sheet, one scroll,
 * then a single confirm button.
 */
export function DelaySheet({
  open,
  onClose,
  onConfirm,
  currentNext,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  currentNext?: string | null;
  busy?: boolean;
}) {
  const options = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(Math.min(21, now.getHours() + 3), 0, 0, 0);

    const weekday = new Date(now);
    weekday.setDate(now.getDate() + 7);
    weekday.setHours(9, 0, 0, 0);

    const weekend = new Date(now);
    const daysToSaturday = (6 - now.getDay() + 7) % 7 || 7;
    weekend.setDate(now.getDate() + daysToSaturday);
    weekend.setHours(9, 0, 0, 0);

    return [
      { id: "today", label: "Later today", date: today },
      { id: "weekday", label: "This time next week", date: weekday },
      { id: "weekend", label: "Saturday morning", date: weekend },
    ];
  }, []);

  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }, []);

  // Captured in an effect (not during render) so the component stays pure.
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => setNowMs(Date.now()), [open]);

  const [picked, setPicked] = useState<string>("today");
  const [customDate, setCustomDate] = useState("");

  const selectedDate =
    picked === "custom" ? new Date(`${customDate}T09:00:00`) : options.find((o) => o.id === picked)?.date;
  const valid =
    selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime()) && selectedDate.getTime() > (nowMs || Number.MAX_SAFE_INTEGER);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Delay this delivery"
      subtitle={currentNext ? `Currently due ${friendlyDate(currentNext)}.` : "Pick a day that suits you."}
      footer={
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => {
            if (selectedDate) onConfirm(selectedDate);
          }}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-[13.5px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Moving…" : `Move to ${selectedDate && valid ? friendlyDate(selectedDate) : "a new day"}`}
        </button>
      }
    >
      <div className="space-y-1.5" role="radiogroup" aria-label="Delay until">
        {options.map((option) => {
          const active = picked === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPicked(option.id)}
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
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-ink">{option.label}</span>
                <span className="block text-[10.5px] text-ink-soft">
                  {friendlyDate(option.date)} ·{" "}
                  {option.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
            </button>
          );
        })}

        <button
          type="button"
          role="radio"
          aria-checked={picked === "custom"}
          onClick={() => setPicked("custom")}
          className={`press flex w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left ${
            picked === "custom" ? "border-brand bg-brand-soft/50" : "border-line/80 bg-white"
          }`}
        >
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-line"
            aria-hidden
          >
            <CalendarIcon className="h-3 w-3 text-ink-soft" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-bold text-ink">Pick a date</span>
            <span className="mt-1 block">
              <input
                type="date"
                min={minDate}
                value={customDate}
                onChange={(event) => {
                  setCustomDate(event.target.value);
                  setPicked("custom");
                }}
                aria-label="Choose a date to delay until"
                className="h-9 rounded-lg border border-line bg-white px-2 text-[12px] font-semibold text-ink"
              />
            </span>
          </span>
        </button>
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">
        Your usual schedule carries on afterwards. Nothing is charged for the skipped day.
      </p>
    </BottomSheet>
  );
}
