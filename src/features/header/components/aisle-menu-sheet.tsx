"use client";

import Link from "next/link";
import type { Category } from "@/lib/types";
import { BottomSheet } from "@/components/bottom-sheet";
import { ArrowRightIcon, PinIcon } from "@/components/icons";

type User = { name: string } | null;

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  postcode: string;
  neighbourhood: string;
  eta: string;
  pathname: string;
  user: User;
  onPickArea: () => void;
  onLogout: () => Promise<void>;
};

/** Mobile aisle browser: delivery area, category grid, account shortcuts. */
export function AisleMenuSheet(props: Props) {
  const { open, onClose, categories, postcode, neighbourhood, eta, pathname, user, onPickArea, onLogout } = props;
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Shop by aisle"
      subtitle={`${categories.length} aisles · delivered in ${eta}`}
      zIndex="z-[75]"
      footer={
        <div className="flex items-center gap-2">
          <Link
            href="/offers"
            onClick={onClose}
            className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand text-[13px] font-bold text-white"
          >
            This week&apos;s offers <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/track"
            onClick={onClose}
            className="press flex h-11 items-center justify-center rounded-full border border-line px-4 text-[13px] font-bold text-ink"
          >
            Track
          </Link>
        </div>
      }
    >
      <button
        type="button"
        onClick={onPickArea}
        className="press flex w-full items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-3 text-left"
      >
        <PinIcon className="h-4 w-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1">
          <span className="block text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
            Delivering to
          </span>
          <span className="block truncate text-[13px] font-bold text-ink">
            {neighbourhood}, {postcode}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-bold text-brand">Change</span>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {categories.map((category) => {
          const active = pathname === `/category/${category.slug}`;
          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              onClick={onClose}
              className={`press flex min-h-[64px] flex-col justify-between rounded-2xl border p-2.5 ${
                active ? "border-brand bg-brand-soft/60" : "border-line/80 bg-white"
              }`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-cream text-[18px]">
                {category.emoji}
              </span>
              <span className="mt-1.5 min-w-0">
                <span className="block truncate text-[12.5px] font-bold text-ink">{category.name}</span>
                <span className="block truncate text-[10px] text-ink-soft">{category.tagline}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/offers#bundles"
          onClick={onClose}
          className="press flex min-h-[48px] items-center gap-2 rounded-2xl border border-line bg-white px-3 text-[12.5px] font-bold text-ink"
        >
          🧺 Bundles
        </Link>
        <Link
          href="/search?q=organic"
          onClick={onClose}
          className="press flex min-h-[48px] items-center gap-2 rounded-2xl border border-line bg-white px-3 text-[12.5px] font-bold text-ink"
        >
          🌱 Organic shop
        </Link>
      </div>

      <div className="mt-3 rounded-2xl border border-line bg-white p-2">
        {user ? (
          <>
            <p className="px-1.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
              Signed in as {user.name.split(" ")[0]}
            </p>
            {[
              { href: "/account", label: "Account overview", icon: "🏠" },
              { href: "/account/orders", label: "Orders", icon: "📦" },
              { href: "/account/saved", label: "Saved items", icon: "❤️" },
              { href: "/account/addresses", label: "Addresses", icon: "📍" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-1.5 text-[13px] font-semibold hover:bg-cream"
              >
                <span aria-hidden>{item.icon}</span> {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={async () => {
                onClose();
                await onLogout();
              }}
              className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-1.5 text-left text-[13px] font-semibold text-ink-soft hover:bg-rose-soft hover:text-clay"
            >
              Sign out
            </button>
          </>
        ) : (
          <div className="p-1.5">
            <p className="text-[12.5px] font-bold text-ink">Guest shopper</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-soft">
              Your basket saves automatically — no sign-in needed to check out.
            </p>
            <div className="mt-2 flex gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="press flex h-10 flex-1 items-center justify-center rounded-full bg-brand text-[12.5px] font-bold text-white"
              >
                Sign in
              </Link>
              <Link
                href="/login?mode=create"
                onClick={onClose}
                className="press flex h-10 flex-1 items-center justify-center rounded-full border border-line text-[12.5px] font-bold text-ink"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-ink-soft">Free delivery over $35 · 30-min slots</p>
    </BottomSheet>
  );
}
