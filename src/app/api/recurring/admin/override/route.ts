import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { recurringLists, recurringRuns } from "@/db/schema";
import { audit, clampInt, cleanText, withAdmin } from "@/lib/admin";
import { logDecision } from "@/features/recurring/state-machine";

export const dynamic = "force-dynamic";

/**
 * Manual allocation override. Admins can jump a list ahead of (or behind) the
 * automatic priority order. Every override is written to recurring_run_events
 * *and* the admin audit log with the reason.
 */
export const POST = withAdmin(async (admin, request) => {
  const body = (await request.json().catch(() => ({}))) as {
    listId?: number;
    priority?: number;
    runId?: number;
    action?: string;
    reason?: string;
  };

  const listId = clampInt(body.listId, 1, Number.MAX_SAFE_INTEGER, 0);
  const reason = cleanText(body.reason, 300);
  if (!listId) throw new Error("listId is required");
  if (!reason) throw new Error("A reason is required for an override");

  const [list] = await db.select().from(recurringLists).where(eq(recurringLists.id, listId)).limit(1);
  if (!list) throw new Error("List not found");

  if (body.action === "pause") {
    const [row] = await db
      .update(recurringLists)
      .set({ status: "paused", pausedReason: `admin: ${reason}`, updatedAt: new Date() })
      .where(eq(recurringLists.id, listId))
      .returning();
    await logDecision({ listId, state: "paused", reason, actor: `admin:${admin.email}` });
    await audit(admin, "recurring.pause", "recurring_list", listId, reason);
    return { list: row };
  }

  if (body.action === "resume") {
    const [row] = await db
      .update(recurringLists)
      .set({ status: "active", pausedReason: null, updatedAt: new Date() })
      .where(eq(recurringLists.id, listId))
      .returning();
    await logDecision({ listId, state: "active", reason, actor: `admin:${admin.email}` });
    await audit(admin, "recurring.resume", "recurring_list", listId, reason);
    return { list: row };
  }

  const priority = clampInt(body.priority, -1_000_000_000, 1_000_000_000, 0);
  const updated = await db
    .update(recurringRuns)
    .set({ priorityScore: priority, updatedAt: new Date() })
    .where(sql`${recurringRuns.listId} = ${listId} and ${recurringRuns.state} = 'scheduled'`)
    .returning({ id: recurringRuns.id });

  await logDecision({
    listId,
    state: "admin_override",
    reason,
    actor: `admin:${admin.email}`,
    detail: `priority set to ${priority}; affected runs: ${updated.map((row) => row.id).join(",") || "none"}`,
  });
  await audit(
    admin,
    "recurring.priority_override",
    "recurring_list",
    listId,
    `priority=${priority} — ${reason}`,
  );

  return { listId, priority, affectedRuns: updated.length };
});

/** Allocation view: who runs first, and why. */
export const GET = withAdmin(async () => {
  const runs = await db
    .select()
    .from(recurringRuns)
    .where(eq(recurringRuns.state, "scheduled"))
    .orderBy(desc(recurringRuns.priorityScore))
    .limit(100);
  return { queue: runs };
});
