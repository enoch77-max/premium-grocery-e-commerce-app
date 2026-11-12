import { getAdminUser } from "@/lib/admin";
import { emitDueReminders, emitRoleShortageAlerts, runScheduler } from "@/features/recurring/services/scheduler";
import { precheckDueLists } from "@/features/recurring/services/precheck";
import { dispatchPending } from "@/features/notifications/dispatch";
import { getStoreSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Scheduler entry point.
 *
 * Safe to call repeatedly and from multiple servers: run claiming relies on
 * `FOR UPDATE SKIP LOCKED` plus a UNIQUE(list_id, occurrence_key) insert.
 * Authenticated by either the CRON_SECRET bearer token or an admin session.
 */
function authorised(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (secret && header === `Bearer ${secret}`) return true;
  return false;
}

async function handle(request: Request) {
  if (!authorised(request)) {
    const admin = await getAdminUser(request);
    if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "run";

  if (mode === "precheck") {
    const settings = await getStoreSettings();
    const leadMinutes = Math.min(3, Math.max(1, settings.shortageLeadDays)) * 24 * 60;
    const findings = await precheckDueLists(new Date(), leadMinutes);
    const alerted = await emitRoleShortageAlerts(
      findings.filter((finding) => finding.shortages.length > 0),
    );
    return Response.json({ ok: true, mode, findings, alerted });
  }

  if (mode === "dispatch") {
    const outcomes = await dispatchPending();
    return Response.json({ ok: true, mode, dispatched: outcomes.filter((o) => o?.status === "dispatched").length });
  }

  const reminders = await emitDueReminders();
  const result = await runScheduler();
  const dispatched = await dispatchPending();
  return Response.json({
    ok: true,
    mode,
    reminders,
    result,
    dispatched: dispatched.filter((outcome) => outcome?.status === "dispatched").length,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
