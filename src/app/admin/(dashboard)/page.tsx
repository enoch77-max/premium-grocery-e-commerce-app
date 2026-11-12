import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { getStoreSettings } from "@/lib/admin";
import { db } from "@/db";
import { desc, gte, sql } from "drizzle-orm";
import { auditLogs, orders, products, users } from "@/db/schema";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function thirtyDaysAgo() {
  return new Date(Date.now() - THIRTY_DAYS_MS);
}

export default async function AdminOverviewPage() {
  const since = thirtyDaysAgo();
  const [settings, totals, window, customers, catalogue, lowStock, recentOrders, activity] =
    await Promise.all([
      getStoreSettings(),
      db
        .select({
          orders: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(total_cents),0)::int`,
          open: sql<number>`count(*) filter (where status not in ('delivered','cancelled'))::int`,
          cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
        })
        .from(orders),
      db
        .select({
          orders: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(total_cents),0)::int`,
        })
        .from(orders)
        .where(gte(orders.createdAt, since)),
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where is_active)::int`,
        })
        .from(products),
      db
        .select({ id: products.id, name: products.name, stock: products.stock })
        .from(products)
        .where(sql`${products.stock} <= 10`)
        .orderBy(products.stock)
        .limit(6),
      db
        .select({
          orderNumber: orders.orderNumber,
          customerName: orders.customerName,
          totalCents: orders.totalCents,
          status: orders.status,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(6),
    ]);

  const t = totals[0] ?? { orders: 0, revenue: 0, open: 0, cancelled: 0 };
  const w = window[0] ?? { orders: 0, revenue: 0 };
  const average = t.orders ? Math.round(t.revenue / t.orders) : 0;

  const cards = [
    {
      label: "Revenue (all time)",
      value: formatMoney(t.revenue),
      note: `${formatMoney(w.revenue)} in 30 days`,
    },
    { label: "Orders", value: String(t.orders), note: `${t.open} open · ${w.orders} in 30 days` },
    { label: "Average basket", value: formatMoney(average), note: `${t.cancelled} cancelled` },
    {
      label: "Customers",
      value: String(customers[0]?.count ?? 0),
      note: `${catalogue[0]?.active ?? 0}/${catalogue[0]?.total ?? 0} products live`,
    },
  ];

  return (
    <div className="space-y-4">
      {!settings.storeOpen ? (
        <div className="rounded-2xl border border-clay/30 bg-rose-soft px-4 py-3">
          <p className="text-[12.5px] font-bold text-clay">Store is paused</p>
          <p className="text-[11.5px] text-ink-soft">
            Checkout is disabled on the storefront. Reopen it from{" "}
            <Link href="/admin/settings" className="font-semibold underline">
              Store settings
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-line bg-white p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">
              {card.label}
            </p>
            <p className="mt-1 font-display text-[24px] font-semibold leading-none tracking-tight">
              {card.value}
            </p>
            <p className="mt-1 text-[10.5px] text-ink-soft">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold">Recent orders</h2>
            <Link href="/admin/orders" className="text-[11.5px] font-bold text-brand">
              Manage →
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-line/70">
            {recentOrders.length === 0 ? (
              <li className="py-3 text-[12px] text-ink-soft">No orders yet.</li>
            ) : null}
            {recentOrders.map((order) => (
              <li key={order.orderNumber} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold">{order.customerName}</p>
                  <p className="text-[10.5px] text-ink-soft">
                    {order.orderNumber} · {order.status}
                  </p>
                </div>
                <span className="text-[12px] font-bold">{formatMoney(order.totalCents)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold">Low stock</h2>
            <Link href="/admin/products" className="text-[11.5px] font-bold text-brand">
              Catalogue →
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-line/70">
            {lowStock.length === 0 ? (
              <li className="py-3 text-[12px] text-ink-soft">Everything is well stocked.</li>
            ) : null}
            {lowStock.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate text-[12px] font-semibold">{item.name}</span>
                <span className={`text-[11px] font-bold ${item.stock === 0 ? "text-clay" : "text-ink-soft"}`}>
                  {item.stock === 0 ? "Out of stock" : `${item.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="text-[13px] font-bold">Activity log</h2>
        <ul className="mt-2 space-y-1.5">
          {activity.length === 0 ? (
            <li className="text-[12px] text-ink-soft">No admin activity recorded yet.</li>
          ) : null}
          {activity.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 text-[11.5px]">
              <span className="font-bold text-ink">{entry.action}</span>
              <span className="text-ink-soft">
                {entry.entity} {entry.entityId}
              </span>
              <span className="text-ink-soft">· {entry.actorEmail}</span>
              <span className="ml-auto text-[10.5px] text-ink-soft/70">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
