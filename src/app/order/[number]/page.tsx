import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderByNumber } from "@/lib/orders";
import { getProducts } from "@/lib/store";
import { deliverySlots, formatDeliverySlot, formatMoney, plural } from "@/lib/format";
import { ProductRail } from "@/components/product-rail";
import { OrderActions } from "@/components/order-actions";
import { SectionHeading } from "@/components/section-heading";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  LeafIcon,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmed — Fresco",
  description: "Your Fresco groceries are on the way.",
};

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const [order, products] = await Promise.all([getOrderByNumber(number), getProducts()]);
  if (!order) notFound();

  const slot = deliverySlots.find((item) => item.id === order.deliverySlot);
  const restock = products
    .filter((product) => product.isBestseller)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-10 pt-5 sm:px-6">
      <section className="overflow-hidden rounded-[26px] border border-line/80 bg-white">
        <div className="relative bg-[#13261d] px-5 py-6 text-cream sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/40 blur-3xl" />
          <div className="relative flex flex-wrap items-start gap-4">
            <span className="animate-pop grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lime text-brand-deep">
              <CheckIcon className="h-6 w-6" strokeWidth={3} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-lime">
                Order {order.orderNumber} confirmed
              </p>
              <h1 className="mt-1 font-display text-[27px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[34px]">
                Thanks, {order.customerName.split(" ")[0]} — we&apos;re packing it now.
              </h1>
              <p className="mt-1.5 max-w-lg text-[12.5px] leading-relaxed text-cream/70">
                A receipt is on its way to {order.email}. Your driver will text before arriving — no need to wait by the
                door.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                  <ClockIcon className="h-3.5 w-3.5 text-lime" />
                  {slot ? `${slot.label} · ${slot.detail}` : formatDeliverySlot(order.deliverySlot)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                  <TruckIcon className="h-3.5 w-3.5 text-lime" /> {plural(order.itemCount, "item")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
                  <ShieldId /> {order.status === "cancelled" ? "Cancelled" : order.paymentMethod === "cash" ? "Cash on delivery" : "Paid by card"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
          <div className="border-b border-line/70 p-5 lg:border-b-0 lg:border-r">
            <h2 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">Your items</h2>
            <div className="mt-3 space-y-2.5">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line/70 bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="block truncate text-[12.5px] font-bold text-ink hover:text-brand"
                    >
                      {item.name}
                    </Link>
                    <p className="truncate text-[10.5px] text-ink-soft">
                      {item.unit} · qty {item.quantity}
                    </p>
                    {item.compareAtCents ? (
                      <p className="text-[9.5px] font-bold text-brand">
                        Saved {formatMoney((item.compareAtCents - item.priceCents) * item.quantity)}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-[12.5px] font-bold text-ink">{formatMoney(item.priceCents * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 border-t border-line/70 pt-3 text-[11.5px]">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="font-semibold text-ink">{formatMoney(order.subtotalCents)}</span>
              </div>
              {order.discountCents > 0 ? (
                <div className="flex justify-between text-brand">
                  <span>{order.couponCode ?? "Coupon"}</span>
                  <span className="font-semibold">−{formatMoney(order.discountCents)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-ink-soft">
                <span>Delivery</span>
                <span className={order.deliveryCents === 0 ? "font-semibold text-brand" : "font-semibold text-ink"}>
                  {order.deliveryCents === 0 ? "Free" : formatMoney(order.deliveryCents)}
                </span>
              </div>
              <div className="flex items-end justify-between border-t border-dashed border-line pt-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">Total paid</span>
                <span className="font-display text-[24px] font-semibold leading-none">{formatMoney(order.totalCents)}</span>
              </div>
              {order.savingsCents > 0 ? (
                <p className="rounded-lg bg-brand-soft/60 px-2 py-1 text-center text-[10.5px] font-bold text-brand-deep">
                  <SparkleIcon className="mr-1 inline h-3 w-3 text-amber" />
                  You saved {formatMoney(order.savingsCents)} on this order
                </p>
              ) : null}
            </div>
          </div>

          <div className="p-5">
            <h2 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">Delivery</h2>
            <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-cream/70 p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-brand">
                <PinIcon className="h-4 w-4" />
              </span>
              <div className="text-[11.5px] leading-relaxed">
                <p className="font-bold text-ink">{order.customerName}</p>
                <p className="text-ink-soft">
                  {order.address}, {order.city} {order.postcode}
                </p>
                {order.phone ? <p className="text-ink-soft">{order.phone}</p> : null}
                {order.notes ? <p className="mt-1 italic text-ink-soft">“{order.notes}”</p> : null}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {[
                { title: "Order received", note: "Payment confirmed", done: true },
                { title: "Packed fresh", note: "Our team picks each item by hand", done: true, active: true },
                { title: "On the way", note: slot ? `${slot.label} · ${slot.detail}` : "Today · 6–8pm", done: false },
                { title: "Delivered", note: "Contactless to your door", done: false },
              ].map((step) => (
                <div key={step.title} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-extrabold ${
                      step.done
                        ? "bg-brand text-white"
                        : step.active
                          ? "animate-pulse bg-lime text-brand-deep"
                          : "border border-line bg-white text-ink-soft"
                    }`}
                  >
                    {step.done ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : ""}
                  </span>
                  <div>
                    <p className={`text-[11.5px] font-bold ${step.done || step.active ? "text-ink" : "text-ink-soft"}`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-ink-soft">{step.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-line/70 p-2.5 text-[10.5px] leading-relaxed text-ink-soft">
              <p className="flex items-center gap-1 font-bold text-ink">
                <LeafIcon className="h-3.5 w-3.5 text-brand" /> Not perfect? We fix it instantly.
              </p>
              Reply to your receipt within 48 hours and we&apos;ll refund the item — no photos, no forms.
            </div>

            <div className="mt-3">
              <OrderActions
                orderNumber={order.orderNumber}
                status={order.status}
                editable={order.status === "confirmed" || order.status === "packing"}
              />
            </div>
            <Link
              href="/category/fresh-produce"
              className="press mt-2 flex h-10 items-center justify-center gap-1.5 rounded-full bg-ink text-[12px] font-bold text-cream hover:bg-brand-deep"
            >
              Continue shopping <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-7">
        <p className="mb-3 rounded-xl border border-line/70 bg-cream/60 px-3 py-2 text-[11px] text-ink-soft">
          Keep this page for updates, or{" "}
          <Link href="/track" className="font-bold text-brand hover:underline">
            track it later with your order number and email
          </Link>
          .
        </p>
        <SectionHeading
          eyebrow="While you wait"
          title="Restock the favourites"
          subtitle="The items neighbours reorder most — add them to your next basket now."
          href="/search?q=bestsellers"
          actionLabel="All bestsellers"
        />
        <ProductRail products={restock} />
      </div>
    </div>
  );
}

function ShieldId() {
  return <ShieldIcon className="h-3.5 w-3.5 text-lime" />;
}
