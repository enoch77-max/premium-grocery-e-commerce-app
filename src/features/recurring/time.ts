import type { Cadence } from "@/features/recurring/types";

/**
 * Timezone-aware scheduling without adding a date library.
 *
 * A list stores a local wall-clock time ("07:30") plus an IANA zone. We need the
 * UTC instant of the next occurrence, and the occurrence key (a stable string per
 * occurrence) used for idempotency.
 */

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let fmt = partsCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(timeZone, fmt);
  }
  return fmt;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return true;
  } catch {
    return false;
  }
}

type WallClock = { year: number; month: number; day: number; hour: number; minute: number };

/** Local wall-clock parts of an instant in a zone. */
export function wallClock(instant: Date, timeZone: string): WallClock {
  const parts = formatter(timeZone).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
}

/** Minutes east of UTC for a zone at an instant (handles DST). */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const wc = wallClock(instant, timeZone);
  const asUtc = Date.UTC(wc.year, wc.month - 1, wc.day, wc.hour, wc.minute);
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * Converts a local wall clock in `timeZone` to the UTC instant. Two passes settle
 * DST boundaries (the offset can change between the naive and corrected guess).
 */
export function zonedToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let guess = new Date(naive - zoneOffsetMinutes(new Date(naive), timeZone) * 60000);
  const check = wallClock(guess, timeZone);
  const drift = Date.UTC(check.year, check.month - 1, check.day, check.hour, check.minute) - naive;
  if (Math.abs(drift) > 60000) {
    guess = new Date(guess.getTime() - drift);
  }
  return guess;
}

function parseLocalTime(localTime: string) {
  const [h, m] = localTime.split(":");
  const hour = Number(h);
  const minute = Number(m);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
    throw new Error(`Invalid local time: ${localTime}`);
  }
  return { hour, minute };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Candidate UTC instant for a calendar day in the list's zone. */
function instantForDay(timeZone: string, localTime: string, y: number, mo: number, d: number): Date {
  const { hour, minute } = parseLocalTime(localTime);
  return zonedToUtc(timeZone, y, mo, Math.min(d, daysInMonth(y, mo)), hour, minute);
}

/**
 * Next occurrence strictly after `after`. Daily/weekly are simple; monthly uses
 * the anchor day, clamped to the month length (31 → 30/28 as needed).
 */
export function nextOccurrence(input: {
  cadence: Cadence;
  localTime: string;
  timeZone: string;
  anchorWeekday?: number | null;
  anchorDay?: number | null;
  after: Date;
}): Date {
  const { cadence, localTime, timeZone, after } = input;
  const wc = wallClock(after, timeZone);

  if (cadence === "daily") {
    const today = instantForDay(timeZone, localTime, wc.year, wc.month, wc.day);
    if (today.getTime() > after.getTime()) return today;
    const nextDay = new Date(Date.UTC(wc.year, wc.month - 1, wc.day + 1));
    return instantForDay(
      timeZone,
      localTime,
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
    );
  }

  if (cadence === "weekly") {
    const target = ((input.anchorWeekday ?? 1) + 7) % 7;
    for (let delta = 0; delta <= 7; delta += 1) {
      const probe = new Date(Date.UTC(wc.year, wc.month - 1, wc.day + delta));
      const candidate = instantForDay(
        timeZone,
        localTime,
        probe.getUTCFullYear(),
        probe.getUTCMonth() + 1,
        probe.getUTCDate(),
      );
      const weekday = new Date(
        Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth(), probe.getUTCDate()),
      ).getUTCDay();
      if (weekday === target && candidate.getTime() > after.getTime()) return candidate;
    }
    const probe = new Date(Date.UTC(wc.year, wc.month - 1, wc.day + 7));
    return instantForDay(
      timeZone,
      localTime,
      probe.getUTCFullYear(),
      probe.getUTCMonth() + 1,
      probe.getUTCDate(),
    );
  }

  // monthly
  const day = input.anchorDay ?? wc.day;
  const thisMonth = instantForDay(timeZone, localTime, wc.year, wc.month, day);
  if (thisMonth.getTime() > after.getTime()) return thisMonth;
  const y = wc.month === 12 ? wc.year + 1 : wc.year;
  const m = wc.month === 12 ? 1 : wc.month + 1;
  return instantForDay(timeZone, localTime, y, m, day);
}

/** Stable identifier for one occurrence: used by the scheduler's unique index. */
export function occurrenceKey(runAt: Date, cadence: Cadence) {
  const iso = runAt.toISOString();
  if (cadence === "daily") return iso.slice(0, 10);
  if (cadence === "monthly") return iso.slice(0, 7);
  return iso.slice(0, 10);
}

export function nextOccurrenceAfter(input: {
  cadence: Cadence;
  localTime: string;
  timeZone: string;
  anchorWeekday?: number | null;
  anchorDay?: number | null;
  from: Date;
}) {
  return nextOccurrence({ ...input, after: input.from });
}
