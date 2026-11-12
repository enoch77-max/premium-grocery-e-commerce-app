import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { recurringLists, recurringRuns } from "@/db/schema";
import { executeRun, retryDueRuns, type RunOutcome } from "@/features/recurring/services/run-list";
import { logDecision } from "@/features/recurring/state-machine";
import { emitNotification } from "@/features/recurring/services/notifications";
import { friendlyDate } from "@/features/recurring/ui/copy";
import { getStoreSettings } from "@/lib/admin";
import { notificationEvents, users } from "@/db/schema";
import { nextOccurrence, occurrenceKey } from "@/features/recurring/time";
import type { Cadence } from "@/features/recurring/types";

/**
 * Scheduler.
 *
 * Concurrency safety has two independent layers:
 *  1. `FOR UPDATE SKIP LOCKED` while selecting due lists — parallel workers skip
 *     rows another worker already holds instead of double-processing them.
 *  2. `INSERT … ON CONFLICT (list_id, occurrence_key) DO NOTHING` when claiming a
 *     run. Even if two servers pick the same list, only one inserts the run; the
 *     other gets no row and does nothing. Every run carries a stable
 *     `idempotencyKey`, so a retried charge can never bill twice.
 *
 * Allocation order is encoded in `priorityScore` (higher runs first):
 *   earliest scheduled time → more completed recurring orders → fewer skips →
 *   older subscription.
 */

export type SchedulerResult = {
  runId: string;
  claimed: number;
  executed: number;
  skippedDuplicate: number;
  outcomes: RunOutcome[];
  retries: RunOutcome[];
  now: string;
};

/** Priority used for scarce-stock allocation. Deterministic and auditable. */
export function computePriority(input: {
  scheduledFor: Date;
  completedRuns: number;
  skipCount: number;
  subscribedAt: Date;
}) {
  const minutesSinceEpoch = Math.floor(input.scheduledFor.getTime() / 60_000);
  // Earliest first: invert time. Consistency then skips then tenure, weighted so
  // that time dominates but consistency still breaks ties.
  const timeScore = -minutesSinceEpoch;
  const consistency = input.completedRuns * 1000 - input.skipCount * 500;
  const tenure = -Math.floor(input.subscribedAt.getTime() / 60_000 / 1000);
  return timeScore + consistency + tenure;
}

export async function runScheduler(
  options: { now?: Date; limit?: number; listIds?: number[] } = {},
): Promise<SchedulerResult> {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 25;
  const onlyIds = options.listIds?.filter(Number.isFinite) ?? null;
  const runId = `sched_${now.toISOString()}_${Math.random().toString(36).slice(2, 10)}`;

  const outcomes: RunOutcome[] = [];
  let claimed = 0;
  let skippedDuplicate = 0;

  // Claim inside a short transaction so locks are released before slow work.
  const claimedRuns = await db.transaction(async (tx) => {
    const dueRows = await tx.execute<{
      id: number;
      cadence: string;
      local_time: string;
      timezone: string;
      anchor_day: number | null;
      anchor_weekday: number | null;
      next_run_at: string | null;
      user_id: number;
      completed_runs: number;
      skip_count: number;
      created_at: string;
    }>(sql`
      select id, cadence, local_time, timezone, anchor_day, anchor_weekday, next_run_at,
             user_id, completed_runs, skip_count, created_at
      from recurring_lists
      where status = 'active'
        and next_run_at is not null
        and next_run_at <= ${now}
        ${onlyIds ? sql`and id in ${sql.raw(`(${onlyIds.join(",")})`)}` : sql``}
      order by next_run_at asc, completed_runs desc, skip_count asc, created_at asc
      limit ${limit}
      for update skip locked
    `);

    const inserted: Array<{ runId: number; listId: number; scheduledFor: Date }> = [];

    for (const row of dueRows.rows) {
      const scheduledFor = row.next_run_at ? new Date(row.next_run_at) : now;
      const key = occurrenceKey(scheduledFor, row.cadence as Cadence);

      const priority = computePriority({
        scheduledFor,
        completedRuns: row.completed_runs,
        skipCount: row.skip_count,
        subscribedAt: new Date(row.created_at),
      });

      const created = await tx.execute<{ id: number }>(sql`
        insert into recurring_runs
          (list_id, occurrence_key, scheduled_for, state, idempotency_key, amount_cents, priority_score, decision_reason)
        values
          (${row.id}, ${key}, ${scheduledFor}, 'scheduled', ${`rec:${row.id}:${key}`}, 0, ${priority},
           ${`allocated by (scheduled_at asc, completed desc, skips asc, oldest)`})
        on conflict (list_id, occurrence_key) do nothing
        returning id
      `);

      if (!created.rows[0]) {
        skippedDuplicate += 1;
        await logDecision({
          listId: row.id,
          state: "duplicate_skipped",
          reason: `run already claimed for ${key} — scheduler is safe to re-run`,
          detail: `schedulerRun=${runId}`,
        });
        continue;
      }

      claimed += 1;
      inserted.push({ runId: created.rows[0].id, listId: row.id, scheduledFor });
    }

    return inserted;
  });

  // Execute outside the transaction: charging must not hold row locks.
  for (const claim of claimedRuns) {
    const [run] = await db.select().from(recurringRuns).where(eq(recurringRuns.id, claim.runId)).limit(1);
    const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, claim.listId)).limit(1);
    if (!run || !list) continue;

    // Honoured customer intents before spending money.
    if (list.skipNextAt) {
      await db
        .update(recurringRuns)
        .set({ state: "cancelled", failureCode: "skipped_by_customer", updatedAt: new Date() })
        .where(eq(recurringRuns.id, run.id));
      await advance(list, claim.scheduledFor, { skipped: true });
      await logDecision({
        listId: list.id,
        runId: run.id,
        state: "cancelled",
        reason: "customer asked to skip this occurrence",
      });
      outcomes.push({ runId: run.id, state: "cancelled", reason: "skipped by customer" });
      continue;
    }

    outcomes.push(await executeRun(run, list));
  }

  const retries = await retryDueRuns(now);

  return {
    runId,
    claimed,
    executed: outcomes.length,
    skippedDuplicate,
    outcomes,
    retries,
    now: now.toISOString(),
  };
}

/** Moves the list to its next occurrence after a skip or a completed run. */
export async function advance(
  list: typeof recurringLists.$inferSelect,
  from: Date,
  flags: { skipped?: boolean } = {},
) {
  const next = nextOccurrence({
    cadence: list.cadence as Cadence,
    localTime: list.localTime,
    timeZone: list.timezone,
    anchorDay: list.anchorDay,
    anchorWeekday: list.anchorWeekday,
    after: from,
  });

  await db
    .update(recurringLists)
    .set({
      nextRunAt: next,
      skipNextAt: null,
      delayUntil: null,
      lastRunAt: new Date(),
      skipCount: flags.skipped ? sql`${recurringLists.skipCount} + 1` : recurringLists.skipCount,
      updatedAt: new Date(),
    })
    .where(eq(recurringLists.id, list.id));

  return next;
}

/**
 * 24-hour style reminder. The window comes from the admin setting
 * `shortageLeadDays` (1–3 days). One reminder per occurrence: deduped on the
 * outbox payload so re-running the cron never double-messages.
 */
export async function emitDueReminders(now = new Date()) {
  const settings = await getStoreSettings();
  const leadDays = Math.min(3, Math.max(1, settings.shortageLeadDays ?? 1));
  const horizon = new Date(now.getTime() + leadDays * 24 * 3600_000);

  const due = await db
    .select()
    .from(recurringLists)
    .where(
      and(
        eq(recurringLists.status, "active"),
        sql`${recurringLists.nextRunAt} is not null`,
        sql`${recurringLists.nextRunAt} <= ${horizon}`,
        sql`${recurringLists.nextRunAt} >= ${now}`,
      ),
    );

  let emitted = 0;
  for (const list of due) {
    const occurrence = list.nextRunAt?.toISOString() ?? "";
    const existing = await db
      .select({ id: notificationEvents.id })
      .from(notificationEvents)
      .where(
        and(
          eq(notificationEvents.type, "run.reminder"),
          eq(notificationEvents.listId, list.id),
          sql`${notificationEvents.payload} like ${`%"occurrence":"${occurrence}"%`}`,
        ),
      )
      .limit(1);
    if (existing.length) continue;

    await emitNotification({
      type: "run.reminder",
      userId: list.userId,
      listId: list.id,
      title: "Your order is coming up",
      body: `"${list.name}" is due ${friendlyDate(list.nextRunAt)}.`,
      payload: { listId: list.id, occurrence, scheduledFor: occurrence },
    });
    emitted += 1;
  }
  return emitted;
}

/**
 * Internal shortage alerts to the roles configured in admin settings. These are
 * operator messages (no customer template), so the dispatcher skips them.
 */
export async function emitRoleShortageAlerts(findings: Array<{ listId: number; shortages: unknown[] }>) {
  const settings = await getStoreSettings();
  const roles: string[] = settings.alertRoles?.length ? settings.alertRoles : ["admin", "stock_manager"];
  if (!findings.length) return 0;

  const recipients = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(sql`${users.role} in (${sql.join(roles.map((role) => sql`${role}`), sql`,`)})`);

  let sent = 0;
  for (const recipient of recipients) {
    for (const finding of findings) {
      await emitNotification({
        type: "precheck.shortage",
        userId: recipient.id,
        listId: finding.listId,
        title: `Stock alert: ${finding.shortages.length} shortage(s)`,
        body: `List #${finding.listId} has shortages inside the lead window.`,
        actor: "scheduler",
        payload: { shortages: finding.shortages, role: recipient.role },
      });
      sent += 1;
    }
  }
  return sent;
}

/** Materialises the first nextRunAt for lists that do not have one yet. */
export async function initialiseNextRun(listId: number, from = new Date()) {
  const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1);
  if (!list) return null;
  const next = nextOccurrence({
    cadence: list.cadence as Cadence,
    localTime: list.localTime,
    timeZone: list.timezone,
    anchorDay: list.anchorDay,
    anchorWeekday: list.anchorWeekday,
    after: from,
  });
  await db.update(recurringLists).set({ nextRunAt: next }).where(eq(recurringLists.id, listId));
  return next;
}

export async function expireStaleHeldRuns(now = new Date()) {
  const stale = await db
    .select({ id: recurringRuns.id })
    .from(recurringRuns)
    .where(
      and(
        eq(recurringRuns.state, "held"),
        inArray(recurringRuns.failureCode, ["out_of_stock", "hold_shortage"]),
      ),
    );
  void now;
  return stale.length;
}
