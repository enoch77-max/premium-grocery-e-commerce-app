/** Shared, framework-free types for recurring grocery lists. */

export const LIST_STATUS = ["active", "paused", "cancelled"] as const;
export type ListStatus = (typeof LIST_STATUS)[number];

export const CADENCE = ["daily", "weekly", "monthly"] as const;
export type Cadence = (typeof CADENCE)[number];

export const SHORTAGE_POLICY = ["skip_item", "partial", "hold"] as const;
export type ShortagePolicy = (typeof SHORTAGE_POLICY)[number];

/**
 * Explicit run state machine. Every transition goes through
 * `transitionRun()` in state-machine.ts, which validates it and appends to
 * recurring_run_events.
 */
export const RUN_STATES = [
  "scheduled",
  "reserved",
  "charged",
  "confirmed",
  "partially_fulfilled",
  "held",
  "failed",
  "cancelled",
] as const;
export type RunState = (typeof RUN_STATES)[number];

export const TERMINAL_STATES: RunState[] = ["confirmed", "partially_fulfilled", "failed", "cancelled"];

export type ShortageDecision = {
  productId: number;
  requested: number;
  granted: number;
  unitPriceCents: number;
};

export type ReservationOutcome =
  | { ok: true; reservationId: number; items: ShortageDecision[]; totalCents: number }
  | { ok: false; reason: "out_of_stock" | "no_items" | "hold_shortage"; items: ShortageDecision[] };

export type PaymentChargeResult =
  | { ok: true; chargeToken: string }
  | {
      ok: false;
      /** declined | expired_card | authentication_required | gateway_unavailable | network */
      code: string;
      message: string;
      /** True when retrying later could plausibly succeed. */
      retryable: boolean;
    };
