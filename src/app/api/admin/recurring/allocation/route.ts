import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringLists, recurringRuns } from "@/db/schema";
import { withPermission } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Scarce-stock allocation view: every scheduled run in automatic priority order
 * with the reason the scheduler recorded, so an operator can see *why* before
 * overriding.
 */
export const GET = withPermission("recurring.allocate", async () => {
  const runs = await db
    .select()
    .from(recurringRuns)
    .where(eq(recurringRuns.state, "scheduled"))
    .orderBy(desc(recurringRuns.priorityScore), desc(recurringRuns.scheduledFor))
    .limit(100);

  const listIds = [...new Set(runs.map((run) => run.listId))];
  const allLists = listIds.length
    ? await db
        .select({ id: recurringLists.id, name: recurringLists.name, status: recurringLists.status })
        .from(recurringLists)
    : [];
  const byId = new Map(allLists.map((list) => [list.id, list]));

  return {
    queue: runs.map((run) => ({
      runId: run.id,
      listId: run.listId,
      listName: byId.get(run.listId)?.name ?? `List #${run.listId}`,
      scheduledFor: run.scheduledFor,
      priorityScore: run.priorityScore,
      decisionReason: run.decisionReason,
      amountCents: run.amountCents,
      attemptCount: run.attemptCount,
    })),
  };
});
