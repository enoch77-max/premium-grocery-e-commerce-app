import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, recurringListItems, recurringLists } from "@/db/schema";
import type { Cadence } from "@/features/recurring/types";

export type DemandRow = {
  productId: number;
  name: string;
  unit: string;
  stock: number;
  demand: number;
  shortfall: number;
  lists: number;
  priceCents: number;
};

/**
 * Recurring demand vs stock for the next `days` days.
 *
 * The source of schedule is the list itself (nextRunAt + cadence), expanded into
 * the occurrences that fall inside the window — runs only exist once the
 * scheduler claims them, so they cannot drive a forecast. Daily lists count every
 * day in the window, weekly once if their weekday appears, monthly once if their
 * (clamped) anchor day appears.
 */
export async function demandForecast(days = 7, now = new Date()): Promise<DemandRow[]> {
  const horizon = new Date(now.getTime() + days * 24 * 3600_000);

  const lists = await db
    .select()
    .from(recurringLists)
    .where(eq(recurringLists.status, "active"));
  if (!lists.length) return [];

  const items = await db
    .select()
    .from(recurringListItems)
    .where(inArray(recurringListItems.listId, lists.map((list) => list.id)));

  const occurrencesInWindow = (list: (typeof lists)[number]) => {
    if (!list.nextRunAt) return 0;
    let count = 0;
    const cursor = new Date(list.nextRunAt.getTime());
    // Walk occurrences forward; bounded by the window so this is always finite.
    for (let guard = 0; guard <= days + 1 && cursor.getTime() <= horizon.getTime(); guard += 1) {
      if (cursor.getTime() >= now.getTime()) count += 1;
      advance(cursor, list.cadence as Cadence, list.anchorWeekday ?? null, list.anchorDay ?? null);
    }
    return count;
  };

  const perList = new Map(lists.map((list) => [list.id, occurrencesInWindow(list)]));

  const demandByProduct = new Map<number, { demand: number; lists: number }>();
  for (const item of items) {
    const occurrences = perList.get(item.listId) ?? 0;
    if (!occurrences) continue;
    const entry = demandByProduct.get(item.productId) ?? { demand: 0, lists: 0 };
    entry.demand += item.quantity * occurrences;
    entry.lists += 1;
    demandByProduct.set(item.productId, entry);
  }

  if (!demandByProduct.size) return [];

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      unit: products.unit,
      stock: products.stock,
      priceCents: products.priceCents,
    })
    .from(products)
    .where(inArray(products.id, [...demandByProduct.keys()]));

  const result: DemandRow[] = rows.map((row) => {
    const entry = demandByProduct.get(row.id) ?? { demand: 0, lists: 0 };
    return {
      productId: row.id,
      name: row.name,
      unit: row.unit,
      stock: row.stock,
      demand: entry.demand,
      shortfall: Math.max(0, entry.demand - row.stock),
      lists: entry.lists,
      priceCents: row.priceCents,
    };
  });

  // Worst shortages first, then heaviest demand.
  return result.sort((a, b) => b.shortfall - a.shortfall || b.demand - a.demand);
}

/** Steps a cursor to the next occurrence of a list. */
function advance(cursor: Date, cadence: Cadence, anchorWeekday: number | null, anchorDay: number | null) {
  if (cadence === "daily") {
    cursor.setDate(cursor.getDate() + 1);
    return;
  }
  if (cadence === "weekly") {
    cursor.setDate(cursor.getDate() + 7);
    return;
  }
  // monthly: jump to the same (clamped) anchor day next month
  const year = cursor.getMonth() === 11 ? cursor.getFullYear() + 1 : cursor.getFullYear();
  const month = cursor.getMonth() === 11 ? 0 : cursor.getMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(anchorDay ?? cursor.getDate(), lastDay);
  cursor.setMonth(month, 1);
  cursor.setDate(day);
  void anchorWeekday;
}
