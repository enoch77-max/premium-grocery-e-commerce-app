import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { notificationEvents, users } from "@/db/schema";
import { withPermission } from "@/lib/admin";
import { dispatchPending } from "@/features/notifications/dispatch";

export const dynamic = "force-dynamic";

/** Message outbox: what was sent, on which channel, and why anything failed. */
export const GET = withPermission("audit.view", async (_admin, request) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status");

  const rows = await db
    .select({
      id: notificationEvents.id,
      userId: notificationEvents.userId,
      listId: notificationEvents.listId,
      runId: notificationEvents.runId,
      type: notificationEvents.type,
      channel: notificationEvents.channel,
      title: notificationEvents.title,
      body: notificationEvents.body,
      status: notificationEvents.status,
      failureCode: notificationEvents.failureCode,
      sentAt: notificationEvents.sentAt,
      createdAt: notificationEvents.createdAt,
      email: users.email,
      name: users.name,
    })
    .from(notificationEvents)
    .leftJoin(users, eq(users.id, notificationEvents.userId))
    .where(
      status
        ? eq(notificationEvents.status, status)
        : q
          ? or(ilike(notificationEvents.title, `%${q}%`), ilike(notificationEvents.body, `%${q}%`))
          : undefined,
    )
    .orderBy(desc(notificationEvents.createdAt))
    .limit(120);

  return { rows };
});

/** Re-drains pending rows (used after configuring a transport). */
export const POST = withPermission("audit.view", async () => {
  const outcomes = await dispatchPending();
  return { dispatched: outcomes.filter((outcome) => outcome?.status === "dispatched").length };
});
