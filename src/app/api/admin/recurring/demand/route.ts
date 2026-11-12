import { withPermission } from "@/lib/admin";
import { demandForecast } from "@/features/recurring/services/demand";

export const dynamic = "force-dynamic";

/** Recurring demand vs stock for the next N days, worst shortages first. */
export const GET = withPermission("recurring.demand", async (_admin, request) => {
  const daysParam = Number(new URL(request.url).searchParams.get("days") ?? 7);
  const days = Math.min(30, Math.max(1, Number.isFinite(daysParam) ? daysParam : 7));
  const rows = await demandForecast(days);
  return { days, rows, shortages: rows.filter((row) => row.shortfall > 0) };
});
