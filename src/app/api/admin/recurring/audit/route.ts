import { desc, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, recurringRunEvents, recurringRuns } from "@/db/schema";
import { withPermission } from "@/lib/admin";

export const dynamic = "force-dynamic";

export type AuditKind = "all" | "orders" | "reservations" | "charges" | "retries" | "overrides";

const KIND_FILTER: Record<Exclude<AuditKind, "all">, string[]> = {
  orders: ["confirmed", "partially_fulfilled"],
  reservations: ["reserved"],
  charges: ["charged"],
  retries: ["held"],
  overrides: ["admin_override", "paused", "active"],
};

/**
 * Searchable audit trail across run events (state transitions, retries,
 * overrides) and the admin audit log. Filters by kind and free-text.
 */
export const GET = withPermission("audit.view", async (_admin, request) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const kind = (url.searchParams.get("kind") as AuditKind | null) ?? "all";

  const like = `%${q}%`;
  const matchesText = q
    ? or(
        ilike(recurringRunEvents.reason, like),
        ilike(recurringRunEvents.detail, like),
        ilike(recurringRunEvents.actor, like),
        ilike(recurringRunEvents.toState, like),
      )
    : undefined;

  const states = kind === "all" ? null : KIND_FILTER[kind];
  const stateFilter =
    kind === "retries"
      ? or(ilike(recurringRunEvents.reason, "%charge failed%"), ilike(recurringRunEvents.reason, "%retry%"))
      : kind === "overrides"
        ? or(ilike(recurringRunEvents.actor, "admin:%"), ilike(recurringRunEvents.toState, "admin_override"))
        : states
          ? or(...states.map((state) => ilike(recurringRunEvents.toState, state)))
          : undefined;

  const events = await db
    .select({
      id: recurringRunEvents.id,
      runId: recurringRunEvents.runId,
      listId: recurringRunEvents.listId,
      fromState: recurringRunEvents.fromState,
      toState: recurringRunEvents.toState,
      reason: recurringRunEvents.reason,
      actor: recurringRunEvents.actor,
      detail: recurringRunEvents.detail,
      createdAt: recurringRunEvents.createdAt,
    })
    .from(recurringRunEvents)
    .where(stateFilter ? (matchesText ? or(stateFilter, matchesText) : stateFilter) : matchesText)
    .orderBy(desc(recurringRunEvents.createdAt))
    .limit(120);

  // Attach order numbers so the trail reads like order history.
  const runIds = [...new Set(events.map((event) => event.runId).filter((id): id is number => Boolean(id)))];
  const runs = runIds.length
    ? await db
        .select({ id: recurringRuns.id, orderNumber: recurringRuns.orderNumber })
        .from(recurringRuns)
        .where(inArray(recurringRuns.id, runIds))
    : [];
  const orderNumbers = new Map(runs.map((run) => [run.id, run.orderNumber]));

  const adminEntries = q
    ? await db
        .select()
        .from(auditLogs)
        .where(or(ilike(auditLogs.action, like), ilike(auditLogs.detail, like), ilike(auditLogs.actorEmail, like)))
        .orderBy(desc(auditLogs.createdAt))
        .limit(60)
    : [];

  return {
    events: events.map((event) => ({
      ...event,
      orderNumber: event.runId ? (orderNumbers.get(event.runId) ?? null) : null,
    })),
    adminEntries,
  };
});
