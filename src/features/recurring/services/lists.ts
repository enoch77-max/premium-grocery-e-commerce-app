import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { recurringListItems, recurringLists, recurringRuns } from "@/db/schema";
import { paymentGatewayStatus } from "@/features/recurring/payments/provider";
import { logDecision } from "@/features/recurring/state-machine";
import { emitNotification } from "@/features/recurring/services/notifications";
import { friendlyDate } from "@/features/recurring/ui/copy";
import { initialiseNextRun } from "@/features/recurring/services/scheduler";
import { nextOccurrence } from "@/features/recurring/time";
import type { Cadence, ShortagePolicy } from "@/features/recurring/types";

export function listStatus() {
  return paymentGatewayStatus();
}

export const CONSENT_VERSION = "2026-01";

/** Creates a list with a recorded consent timestamp and its first due instant. */
export async function createList(input: {
  userId: number;
  name: string;
  cadence: Cadence;
  localTime: string;
  timezone: string;
  shortagePolicy: ShortagePolicy;
  paymentMethodId: number;
  consentIp: string;
  anchorWeekday: number | null;
  anchorDay: number | null;
  addressLine1: string;
  addressCity: string;
  addressPostcode: string;
  items: Array<{ productId: number; quantity: number; priceAtCreationCents: number }>;
}) {
  const consentAt = new Date();
  const first = nextOccurrence({
    cadence: input.cadence,
    localTime: input.localTime,
    timeZone: input.timezone,
    anchorDay: input.anchorDay,
    anchorWeekday: input.anchorWeekday,
    after: new Date(),
  });

  const [row] = await db
    .insert(recurringLists)
    .values({
      userId: input.userId,
      name: input.name.slice(0, 120),
      cadence: input.cadence,
      localTime: input.localTime,
      timezone: input.timezone,
      shortagePolicy: input.shortagePolicy,
      paymentMethodId: input.paymentMethodId,
      consentAt,
      consentVersion: CONSENT_VERSION,
      consentIp: input.consentIp,
      anchorWeekday: input.anchorWeekday,
      anchorDay: input.anchorDay,
      addressLine1: input.addressLine1.slice(0, 200),
      addressCity: input.addressCity.slice(0, 80),
      addressPostcode: input.addressPostcode.slice(0, 20),
      nextRunAt: first,
    })
    .returning();

  await logDecision({
    listId: row.id,
    state: "scheduled",
    reason: `list created; consent recorded ${consentAt.toISOString()}`,
    actor: `user:${input.userId}`,
    detail: `cadence=${input.cadence} tz=${input.timezone} at=${input.localTime} policy=${input.shortagePolicy} payment=${input.paymentMethodId || "none (gateway unconfigured)"}`,
  });

  return row;
}

export async function setListStatus(
  listId: number,
  userId: number,
  action: "pause" | "resume" | "cancel",
  reason: string,
) {
  const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1);
  if (!list || list.userId !== userId) return null;

  if (action === "pause") {
    const [row] = await db
      .update(recurringLists)
      .set({ status: "paused", pausedReason: reason, updatedAt: new Date() })
      .where(eq(recurringLists.id, listId))
      .returning();
    await logDecision({ listId, state: "paused", reason, actor: `user:${userId}` });
    await emitNotification({
      type: "run.paused",
      userId,
      listId,
      title: "List paused",
      body: `Paused "${row.name}". Everything stays saved.`,
      actor: `user:${userId}`,
      payload: { listId },
    });
    return row;
  }

  if (action === "resume") {
    const [row] = await db
      .update(recurringLists)
      .set({ status: "active", pausedReason: null, consecutiveFailures: 0, updatedAt: new Date() })
      .where(eq(recurringLists.id, listId))
      .returning();
    if (!row.nextRunAt || row.nextRunAt.getTime() <= Date.now()) {
      await initialiseNextRun(listId);
    }
    await logDecision({ listId, state: "active", reason: "resumed by customer", actor: `user:${userId}` });
    return row;
  }

  const [row] = await db
    .update(recurringLists)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(recurringLists.id, listId))
    .returning();
  await logDecision({ listId, state: "cancelled", reason: "cancelled by customer", actor: `user:${userId}` });
  return row;
}

/** Skips exactly one occurrence, keeping the list active. */
export async function skipNext(listId: number, userId: number) {
  const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1);
  if (!list || list.userId !== userId) return null;
  const [row] = await db
    .update(recurringLists)
    .set({ skipNextAt: new Date(), updatedAt: new Date() })
    .where(eq(recurringLists.id, listId))
    .returning();
  await logDecision({
    listId,
    state: "skip_requested",
    reason: "customer skipped the next occurrence",
    actor: `user:${userId}`,
  });
  await emitNotification({
    type: "run.skipped",
    userId,
    listId,
    title: "Delivery skipped",
    body: `Skipped the next delivery of "${row.name}".`,
    actor: `user:${userId}`,
    payload: { listId, when: row.nextRunAt ? friendlyDate(row.nextRunAt) : undefined },
  });
  return row;
}

/** Postpones the next occurrence to a chosen instant; cadence resumes after. */
export async function delayNext(listId: number, userId: number, until: Date) {
  const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1);
  if (!list || list.userId !== userId) return null;
  const [row] = await db
    .update(recurringLists)
    .set({
      delayUntil: until,
      nextRunAt: until,
      updatedAt: new Date(),
      completedRuns: sql`${recurringLists.completedRuns}`,
    })
    .where(eq(recurringLists.id, listId))
    .returning();
  await logDecision({
    listId,
    state: "delayed",
    reason: `customer delayed next run to ${until.toISOString()}`,
    actor: `user:${userId}`,
  });
  await emitNotification({
    type: "run.delayed",
    userId,
    listId,
    title: "Delivery moved",
    body: `Moved "${row.name}" to ${friendlyDate(until)}.`,
    actor: `user:${userId}`,
    payload: { listId, when: friendlyDate(until) },
  });
  return row;
}

/**
 * Edits a saved list. Paused and active lists are both editable; cancelled ones
 * are not (they are historical). Items are replaced wholesale, keeping the
 * original creation price for any product already on the list so price-change
 * detection stays meaningful.
 */
export async function updateList(
  listId: number,
  userId: number,
  input: {
    name?: string;
    cadence?: Cadence;
    localTime?: string;
    timezone?: string;
    shortagePolicy?: ShortagePolicy;
    anchorWeekday?: number | null;
    anchorDay?: number | null;
    items?: Array<{ productId: number; quantity: number; priceAtCreationCents: number }>;
  },
) {
  const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1);
  if (!list || list.userId !== userId) return null;
  if (list.status === "cancelled") return { ...list, rejected: "cancelled" as const };

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name) patch.name = input.name.slice(0, 120);
  if (input.cadence) patch.cadence = input.cadence;
  if (input.localTime) patch.localTime = input.localTime;
  if (input.timezone) patch.timezone = input.timezone;
  if (input.shortagePolicy) patch.shortagePolicy = input.shortagePolicy;
  if (input.anchorWeekday !== undefined) patch.anchorWeekday = input.anchorWeekday;
  if (input.anchorDay !== undefined) patch.anchorDay = input.anchorDay;

  // Re-arm the schedule when cadence or time changed.
  const storable = patch as {
    cadence?: Cadence;
    localTime?: string;
    timezone?: string;
    anchorDay?: number | null;
    anchorWeekday?: number | null;
  };
  const scheduleChanged = Boolean(input.cadence ?? input.localTime ?? input.timezone);
  if (scheduleChanged && list.status === "active") {
    patch.nextRunAt = nextOccurrence({
      cadence: storable.cadence ?? (list.cadence as Cadence),
      localTime: storable.localTime ?? list.localTime,
      timeZone: storable.timezone ?? list.timezone,
      anchorDay: storable.anchorDay ?? list.anchorDay,
      anchorWeekday: storable.anchorWeekday ?? list.anchorWeekday,
      after: new Date(),
    });
  }

  const [row] = await db.update(recurringLists).set(patch).where(eq(recurringLists.id, listId)).returning();

  if (input.items?.length) {
    const existing = await db.select().from(recurringListItems).where(eq(recurringListItems.listId, listId));
    const seen = new Map(existing.map((item) => [item.productId, item.priceAtCreationCents]));
    await db.delete(recurringListItems).where(eq(recurringListItems.listId, listId));
    await db.insert(recurringListItems).values(
      input.items.map((item) => ({
        listId,
        productId: item.productId,
        quantity: item.quantity,
        priceAtCreationCents: seen.get(item.productId) ?? item.priceAtCreationCents,
      })),
    );
  }

  await logDecision({
    listId,
    state: row.status,
    reason: "list edited by customer",
    actor: `user:${userId}`,
    detail: Object.keys(patch)
      .filter((key) => key !== "updatedAt")
      .join(", "),
  });

  return row;
}

/**
 * Resolves a held run with the customer's choice:
 *  • continue_partial → charge and fulfil whatever is still available now
 *  • wait             → leave the list active and try again on the next date
 *  • cancel           → cancel this occurrence only; the list keeps its schedule
 */
export async function resolveHeldRun(
  listId: number,
  runId: number,
  userId: number,
  action: "continue_partial" | "wait" | "cancel",
) {
  const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1);
  if (!list || list.userId !== userId) return null;

  const [run] = await db.select().from(recurringRuns).where(eq(recurringRuns.id, runId)).limit(1);
  if (!run || run.listId !== listId) return null;
  if (run.state !== "held") return { run, rejected: "not_held" as const };

  if (action === "cancel") {
    await db
      .update(recurringRuns)
      .set({ state: "cancelled", failureCode: "cancelled_by_customer", updatedAt: new Date() })
      .where(eq(recurringRuns.id, runId));
    await logDecision({
      listId,
      runId,
      state: "cancelled",
      reason: "customer cancelled this occurrence",
      actor: `user:${userId}`,
    });
    return { run, state: "cancelled" };
  }

  if (action === "wait") {
    await logDecision({
      listId,
      runId,
      state: "held",
      reason: "customer chose to wait for the next delivery",
      actor: `user:${userId}`,
    });
    return { run, state: "held" };
  }

  // continue_partial: allow the run to be re-attempted immediately, and relax the
  // policy to "partial" so a repeat shortage cannot hold it again.
  await db
    .update(recurringLists)
    .set({ shortagePolicy: "partial", status: "active", updatedAt: new Date() })
    .where(eq(recurringLists.id, listId));
  await db
    .update(recurringRuns)
    .set({ state: "scheduled", attemptCount: 0, nextAttemptAt: null, updatedAt: new Date() })
    .where(eq(recurringRuns.id, runId));
  await logDecision({
    listId,
    runId,
    state: "scheduled",
    reason: "customer chose to continue with the rest",
    actor: `user:${userId}`,
  });

  return { run, state: "scheduled" };
}
