"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { OrderItemRecord } from "@/lib/order-types";

/** Itemised receipt lines for one order. */
export function OrderItemsCard({ items }: { items: OrderItemRecord[] }) {
  return (
    <div className="mt-2 divide-y divide-line/70">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 py-2">
          <Link
            href={`/product/${item.productSlug}`}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line/60 bg-cream"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/product/${item.productSlug}`}
              className="block truncate text-[12px] font-bold text-ink hover:text-brand"
            >
              {item.name}
            </Link>
            <p className="text-[10.5px] text-ink-soft">
              {item.unit} · qty {item.quantity}
            </p>
          </div>
          <p className="text-[12px] font-bold text-ink">
            {formatMoney(item.priceCents * item.quantity)}
          </p>
        </div>
      ))}
    </div>
  );
}
