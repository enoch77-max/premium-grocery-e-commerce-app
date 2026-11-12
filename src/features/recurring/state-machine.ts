import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringRunEvents, recurringRuns } from "@/db/schema";
import { TERMINAL_STATES, RUN_STATES, type RunState } from "@/features/recurring/types";

/**
 * Legal transitions. Anything not listed is rejected, so a bug can never move a
 * run from e.g. failed to confirmed.
 */
const ALLOWED: Record<RunState, RunState[]> = {
  scheduled: ["reserved", "held", "cancelled", "failed"],
  reserved: ["charged", "held", "failed", "cancelled"],
  charged: ["confirmed", "partially_fulfilled", "failed", "held"],
  confirmed: [],
  partially_fulfilled: [],
  held: ["scheduled", "cancelled", "failed"],
  failed: ["scheduled"],
  cancelled: [],
};

export function canTransition(from: RunState, to: RunState) {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function isTerminal(state: RunState) {
  return TERMINAL_STATES.includes(state);
}

export function assertKnownState(state: string): RunState {
  if (!(RUN_STATES as readonly string[]).includes(state)) {
    throw new Error(`Unknown recurring run state: ${state}`);
  }
  return state as RunState;
}

/**
 * Applies a transition and writes the audit row in the same transaction.
 * Returns the updated run so callers can act on the authoritative state.
 */
export async function transitionRun(input: {
  runId: number;
  listId: number;
  from: RunState;
  to: RunState;
  reason: string;
  actor?: string;
  detail?: string;
  patch?: Record<string, unknown>;
}) {
  if (!canTransition(input.from, input.to)) {
    throw new Error(`Illegal run transition ${input.from} → ${input.to} (run ${input.runId})`);
  }

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(recurringRuns)
      .set({
        state: input.to,
        updatedAt: new Date(),
        ...(input.patch ?? {}),
      })
      .where(eq(recurringRuns.id, input.runId))
      .returning();

    await tx.insert(recurringRunEvents).values({
      runId: input.runId,
      listId: input.listId,
      fromState: input.from,
      toState: input.to,
      reason: input.reason.slice(0, 500),
      actor: input.actor ?? "scheduler",
      detail: (input.detail ?? "").slice(0, 1000),
    });

    return updated[0];
  });
}

/** Records a decision without changing state (allocation, override, precheck). */
export async function logDecision(input: {
  listId: number;
  runId?: number | null;
  state: string;
  reason: string;
  actor?: string;
  detail?: string;
}) {
  await db.insert(recurringRunEvents).values({
    runId: input.runId ?? null,
    listId: input.listId,
    fromState: null,
    toState: input.state,
    reason: input.reason.slice(0, 500),
    actor: input.actor ?? "scheduler",
    detail: (input.detail ?? "").slice(0, 1000),
  });
}
