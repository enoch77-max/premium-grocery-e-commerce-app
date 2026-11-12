"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPercent, formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { useDelivery } from "@/components/delivery-provider";
import { CartControls } from "@/components/cart-controls";
import { HighlightTiles, SpecStrip, TrustRow } from "@/components/product-signals";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  LeafIcon,
  ShieldIcon,
  SparkleIcon,
  StarIcon,
  TruckIcon,
} from "@/components/icons";

const slots = [
  { id: "express", label: "Express", note: "" },
  { id: "today-18", label: "6–8pm", note: "Today" },
  { id: "tomorrow-09", label: "Tomorrow", note: "9–11am" },
];

const REVIEWS = [
  {
    name: "Nadia P.",
    when: "2 days ago",
    title: "Repeat buy, again",
    body: "Arrived cold and perfectly packed. This is one of those items I now add without thinking — the quality hasn't dipped once.",
  },
  {
    name: "Marcus D.",
    when: "1 week ago",
    title: "Worth the extra",
    body: "Tried the cheaper alternative last month and came straight back. You can taste the difference, especially cooked simply.",
  },
];

export function ProductBuyPanel({ product, categoryName }: { product: Product; categoryName: string }) {
  const { add, openCart, quantityOf } = useCart();
  const { area, slot, setSlot, openPicker } = useDelivery();
  const [tab, setTab] = useState<"details" | "storage" | "reviews">("details");
  const [showSticky, setShowSticky] = useState(false);
  const quantity = quantityOf(product.id);
  const discount = discountPercent(product.priceCents, product.compareAtCents);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex flex-col">
      <nav className="hidden flex-wrap items-center gap-1 text-[11px] font-medium text-ink-soft lg:flex">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <ChevronRightIcon className="h-3 w-3" />
        <Link href={`/category/${product.categorySlug}`} className="hover:text-brand">
          {categoryName}
        </Link>
        <ChevronRightIcon className="h-3 w-3" />
        <span className="truncate font-semibold text-ink">{product.name}</span>
      </nav>

      {/* brand alone here — freshness, diet and proof signals already speak
          from the seal, the photo chips and the spec strip */}
      <div className="order-1 flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-brand">
          {product.brand}
        </span>
      </div>

      <h1 className="order-2 mt-1.5 font-display text-[23px] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[36px] sm:leading-[1.04]">
        {product.name}
      </h1>

      <div className="order-3 mt-1.5 flex flex-wrap items-center gap-2.5 sm:mt-2">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 text-amber">
            {[0, 1, 2, 3, 4].map((star) => (
              <StarIcon
                key={star}
                className={`h-3.5 w-3.5 ${star < Math.round(product.rating) ? "" : "text-line"}`}
              />
            ))}
          </div>
          <span className="text-[12px] font-bold text-ink">{product.rating.toFixed(1)}</span>
        </div>
        <button
          type="button"
          onClick={() => setTab("reviews")}
          className="text-[11.5px] font-medium text-ink-soft underline-offset-2 hover:text-brand hover:underline"
        >
          {product.reviewCount} verified reviews
        </button>
      </div>

      <div className="order-8 mt-3 lg:order-3">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{product.description}</p>
        <div className="mt-2">
          <HighlightTiles product={product} />
        </div>
      </div>

      <div className="order-4 mt-2.5 rounded-xl border border-line/80 bg-white px-3 py-2.5 sm:mt-3 sm:p-3.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-ink sm:text-[30px]">
              {formatMoney(product.priceCents)}
            </span>
            {product.compareAtCents ? (
              <span className="text-[13px] font-medium text-ink-soft line-through">
                {formatMoney(product.compareAtCents)}
              </span>
            ) : null}
            {discount > 0 ? (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-extrabold text-brand-deep">
                Save {discount}%
              </span>
            ) : null}
          </div>
          <span className="hidden text-[10.5px] font-medium text-ink-soft sm:inline">
            {formatMoney(product.priceCents)} / {product.unit.split("·")[0].trim()} · tax included
          </span>
        </div>
      </div>

      {/* one compact fact bar replaces four oversized cards */}
      <div className="order-5 mt-2">
        <SpecStrip product={product} />
      </div>

      <div className="order-9 mt-3 rounded-2xl border border-line/80 bg-cream/60 p-3 lg:order-6">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={openPicker}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-ink hover:text-brand"
          >
            <TruckIcon className="h-4 w-4 text-brand" /> Delivering to {area.postcode}
            <span className="text-[10px] font-semibold text-brand underline-offset-2 hover:underline">
              Change
            </span>
          </button>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-brand-deep">
            <ClockIcon className="h-3 w-3" /> {area.eta}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {slots.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSlot(option.id)}
              className={`press rounded-xl border px-2 py-1.5 text-left transition ${
                slot === option.id
                  ? "border-brand bg-white shadow-sm"
                  : "border-line/80 bg-white/60 hover:border-brand/40"
              }`}
            >
              <span className="block text-[10.5px] font-bold text-ink">{option.label}</span>
              <span className="block text-[9.5px] text-ink-soft">
                {option.id === "express" ? area.eta : option.note}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] text-ink-soft">
          Free delivery on baskets over $35 · otherwise $3.99. Refunds are instant if anything isn&apos;t
          perfect.
        </p>
      </div>

      {/* Two full-width stacked CTAs eat ~110px of a phone screen, so below sm
          they share one row; desktop keeps the stacked pair. */}
      <div className="order-6 mt-2.5 grid grid-cols-2 gap-2 sm:mt-3 sm:grid-cols-1">
        <CartControls product={product} size="lg" label="Add to basket" />
        <button
          type="button"
          onClick={() => {
            if (quantity === 0) void add(product);
            openCart();
          }}
          className="press flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-bold text-cream hover:bg-brand-deep sm:h-12 sm:text-[14px]"
        >
          <span className="sm:hidden">Buy now</span>
          <span className="hidden sm:inline">Buy now · checkout in 30 seconds</span>
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="order-7 mt-2 rounded-xl bg-brand-soft/50 px-3 py-2">
        {product.stock <= 30 ? (
          <p className="mb-1.5 text-center text-[10.5px] font-bold text-clay">
            Only {product.stock} left in today&apos;s stock
          </p>
        ) : null}
        <TrustRow />
      </div>

      <a
        href="#frequently-bought"
        className="press order-10 mt-3 flex items-center justify-between rounded-2xl border border-dashed border-brand/35 bg-white px-3.5 py-2.5 text-left hover:border-brand"
      >
        <span>
          <span className="flex items-center gap-1 text-[11.5px] font-bold text-brand-deep">
            <SparkleIcon className="h-3.5 w-3.5 text-amber" /> Make it a meal and save
          </span>
          <span className="text-[10.5px] text-ink-soft">
            Our buyers paired this with 2 essentials — add both in one tap.
          </span>
        </span>
        <ArrowRightIcon className="h-4 w-4 shrink-0 text-brand" />
      </a>

      <div className="order-11 mt-4 overflow-hidden rounded-2xl border border-line/80 bg-white">
        <div className="flex border-b border-line/70">
          {(
            [
              { id: "details", short: "Details", label: "Details" },
              { id: "storage", short: "Storage", label: "Storage & origin" },
              { id: "reviews", short: "Reviews", label: `Reviews (${product.reviewCount})` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`relative flex-1 whitespace-nowrap px-2 py-2.5 text-[11px] font-bold transition sm:text-[11.5px] ${
                tab === item.id ? "text-brand-deep" : "text-ink-soft hover:text-ink"
              }`}
            >
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
              {tab === item.id ? (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand" />
              ) : null}
            </button>
          ))}
        </div>
        <div className="p-3.5 text-[11.5px] leading-relaxed text-ink-soft">
          {tab === "details" ? (
            <div className="space-y-2">
              <p>{product.description}</p>
              <ul className="space-y-1">
                {product.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-1.5">
                    <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                    <span className="text-ink">{highlight}</span>
                  </li>
                ))}
                <li className="flex items-start gap-1.5">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="text-ink">Sold by {product.brand}, packed by Fresco</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-1 pt-1">
                {product.tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="whitespace-nowrap rounded-full bg-cream px-2 py-0.5 text-[9.5px] font-semibold text-ink-soft"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {tab === "storage" ? (
            <div className="space-y-2">
              <p>
                <strong className="text-ink">Storage.</strong> {product.storage}
              </p>
              <p>
                <strong className="text-ink">Sourced from.</strong> {product.origin}.
              </p>
              <p>
                <strong className="text-ink">Packaging.</strong> Recyclable where possible; returnable glass
                on milk and water bottles.
              </p>
            </div>
          ) : null}
          {tab === "reviews" ? (
            <div className="space-y-2.5">
              {REVIEWS.map((review) => (
                <div key={review.name} className="rounded-xl border border-line/70 bg-cream/40 p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-ink">{review.title}</p>
                    <div className="flex items-center gap-0.5 text-amber">
                      {[0, 1, 2, 3, 4].map((star) => (
                        <StarIcon key={star} className="h-2.5 w-2.5" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-soft">{review.body}</p>
                  <p className="mt-1 text-[9.5px] font-semibold text-ink-soft">
                    {review.name} · verified purchase · {review.when}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Parked on top of the bottom navigation, never behind it. */}
      {showSticky ? (
        <div className="above-tabbar animate-fade-up fixed inset-x-0 z-40 border-t border-line bg-white/95 px-3 py-2 backdrop-blur sm:py-2.5 lg:hidden">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-bold text-ink">{product.name}</p>
              <p className="text-[12px] font-extrabold text-brand-deep">
                {formatMoney(product.priceCents)}
                {product.compareAtCents ? (
                  <span className="ml-1.5 text-[10px] font-medium text-ink-soft line-through">
                    {formatMoney(product.compareAtCents)}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="w-[124px] shrink-0 min-[380px]:w-[150px] sm:w-[180px]">
              <CartControls product={product} label="Add" size="sm" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
