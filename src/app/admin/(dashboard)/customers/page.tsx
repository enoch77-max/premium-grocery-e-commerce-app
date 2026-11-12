import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      marketingOptIn: users.marketingOptIn,
      createdAt: users.createdAt,
      orderCount: sql<number>`count(${orders.id})::int`,
      lifetimeCents: sql<number>`coalesce(sum(${orders.totalCents}),0)::int`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">Customers</h1>
        <p className="text-[11.5px] text-ink-soft">
          {rows.length} accounts · lifetime value and marketing consent.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-cream/70 text-[10px] uppercase tracking-[0.08em] text-ink-soft">
            <tr>
              <th className="px-3 py-2 font-bold">Customer</th>
              <th className="px-3 py-2 font-bold">Orders</th>
              <th className="px-3 py-2 font-bold">Lifetime</th>
              <th className="hidden px-3 py-2 font-bold sm:table-cell">Marketing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2">
                  <p className="font-bold leading-tight">{row.name}</p>
                  <p className="text-[10.5px] text-ink-soft">{row.email}</p>
                  {row.role !== "customer" ? (
                    <span className="mt-0.5 inline-flex rounded-full bg-brand-soft px-1.5 text-[9px] font-bold uppercase text-brand-deep">
                      {row.role}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 font-semibold">{row.orderCount}</td>
                <td className="px-3 py-2 font-semibold">{formatMoney(row.lifetimeCents)}</td>
                <td className="hidden px-3 py-2 text-ink-soft sm:table-cell">
                  {row.marketingOptIn ? "Opted in" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
