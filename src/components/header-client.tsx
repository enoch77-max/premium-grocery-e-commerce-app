"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { useDelivery } from "@/components/delivery-provider";
import { useSession } from "@/components/session-provider";
import { useMobileUi } from "@/components/mobile-ui-provider";
import dynamic from "next/dynamic";

// Search + aisle sheets are interaction-only surfaces.
const SearchOverlay = dynamic(() => import("@/components/search-overlay").then((m) => m.SearchOverlay), {
  ssr: false,
});
import { SearchBox } from "@/components/search-box";
const AisleMenuSheet = dynamic(
  () => import("@/features/header/components/aisle-menu-sheet").then((m) => m.AisleMenuSheet),
  { ssr: false },
);
import { AccountMenu } from "@/features/header/components/account-menu";
import { AnnouncementBar } from "@/features/header/components/announcement-bar";
import {
  ArrowRightIcon,
  BoltIcon,
  CartIcon,
  ChevronDownIcon,
  LeafIcon,
  MenuIcon,
  PinIcon,
  SearchIcon,
  SparkleIcon,
  TruckIcon,
  UserIcon,
} from "@/components/icons";

export function HeaderClient({
  categories,
  announcement = "Free delivery over $35",
  storeOpen = true,
}: {
  categories: Category[];
  announcement?: string;
  storeOpen?: boolean;
}) {
  const { cart, openCart, pulse } = useCart();
  const { area, openPicker } = useDelivery();
  const { user, logout } = useSession();
  const { searchOpen, openSearch, closeSearch, menuOpen, openMenu, closeMenu } = useMobileUi();
  const pathname = usePathname();

  useEffect(() => {
    const focusSearch = () => {
      const inline = document.getElementById("fresco-search-input") as HTMLInputElement | null;
      if (inline && window.matchMedia("(min-width: 640px)").matches) inline.focus();
      else openSearch();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  const count = cart?.itemCount ?? 0;
  const subtotal = cart?.subtotalCents ?? 0;

  return (
    <>      <AnnouncementBar announcement={announcement} storeOpen={storeOpen} />
      {!storeOpen ? (
        <div className="bg-rose-soft px-4 py-2 text-center text-[11.5px] font-bold text-clay">
          We are paused for a short restock — ordering reopens very soon.
        </div>
      ) : null}

      <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1340px] 2xl:max-w-[1600px] px-3 sm:px-6">
          <div className="flex h-14 items-center gap-2 sm:h-[74px] sm:gap-4">
            <button
              type="button"
              onClick={openMenu}
              className="press tap-xl -ml-1 grid shrink-0 place-items-center rounded-full text-ink hover:bg-cream-deep lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2">
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-brand text-lime shadow-[0_6px_16px_-8px_rgba(15,122,77,0.9)] transition group-hover:rotate-3">
                <LeafIcon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-[22px] font-semibold tracking-[-0.03em] text-ink sm:text-[26px]">
                  fresco
                </span>
                <span className="mt-0.5 hidden text-[9px] font-bold uppercase tracking-[0.22em] text-ink-soft sm:block">
                  green grocer
                </span>
              </span>
            </Link>

            {/* Phones: search lives in the header row itself — one line, no
                second storey. Tapping opens the full-screen live search. */}
            <button
              type="button"
              onClick={openSearch}
              className="press flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-white px-3 text-left shadow-[0_1px_0_rgba(19,38,29,0.03)] sm:hidden"
              aria-label="Search groceries"
            >
              <SearchIcon className="h-4 w-4 shrink-0 text-brand" />
              <span className="truncate text-[12.5px] text-ink-soft/80">Search groceries…</span>
            </button>

            <button
              type="button"
              onClick={openPicker}
              className="press hidden items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-cream-deep/70 xl:flex"
              aria-label={`Delivering to ${area.neighbourhood} ${area.postcode}. Change delivery area`}
            >
              <PinIcon className="h-4 w-4 text-brand" />
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                  Deliver to
                </span>
                <span className="text-[12.5px] font-bold text-ink">
                  {area.neighbourhood} {area.postcode}
                </span>
              </span>
              <ChevronDownIcon className="h-3.5 w-3.5 text-ink-soft" />
            </button>

            <button
              type="button"
              onClick={openPicker}
              className="press hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink hover:border-brand md:flex xl:hidden"
              aria-label="Change delivery area"
            >
              <PinIcon className="h-3.5 w-3.5 text-brand" />
              {area.postcode}
              <ChevronDownIcon className="h-3 w-3 text-ink-soft" />
            </button>

            {/* Desktop: search lives in the header and answers as you type. */}
            <div className="hidden min-w-0 flex-1 sm:block sm:max-w-2xl">
              <SearchBox categories={categories} variant="inline" onDone={() => {}} />
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <div className="relative hidden sm:block">
                <AccountMenu user={user} onLogout={logout} />
              </div>

              <button
                type="button"
                onClick={openCart}
                className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-cream hover:bg-brand-deep sm:flex sm:h-11 sm:w-auto sm:items-center sm:gap-2.5 sm:py-0 sm:pr-4 sm:pl-3"
                aria-label={
                  count > 0 ? `Open basket, ${count} items, ${formatMoney(subtotal)}` : "Open basket"
                }
              >
                <span className="relative">
                  <CartIcon className="h-5 w-5" />
                  {count > 0 ? (
                    <span
                      key={`${pulse}-${count}`}
                      className="animate-pop absolute -right-2 -top-2 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-lime px-1 text-[10px] font-extrabold text-ink"
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </span>
                <span className="hidden flex-col items-start leading-tight md:flex">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-cream/60">
                    Basket
                  </span>
                  <span className="text-[12.5px] font-bold">{formatMoney(subtotal)}</span>
                </span>
              </button>
            </div>
          </div>

          <nav className="no-scrollbar -mx-4 hidden items-center gap-0.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex sm:px-0">
            <Link
              href="/category/fresh-produce"
              className={`relative shrink-0 rounded-t-lg px-2.5 py-2 text-[12.5px] font-semibold transition hover:text-brand ${
                pathname === "/category/fresh-produce" ? "text-brand" : "text-ink-soft"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <SparkleIcon className="h-3.5 w-3.5 text-amber" /> Fresh today
              </span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className={`shrink-0 rounded-t-lg px-2.5 py-2 text-[12.5px] font-semibold transition hover:text-brand ${
                  pathname === `/category/${category.slug}` ? "text-brand" : "text-ink-soft"
                }`}
              >
                {category.name}
              </Link>
            ))}
            <Link
              href="/offers"
              className={`shrink-0 rounded-t-lg px-2.5 py-2 text-[12.5px] font-bold transition hover:text-clay ${
                pathname === "/offers" ? "text-clay" : "text-clay/80"
              }`}
            >
              Offers
            </Link>
            <Link
              href="/offers#bundles"
              className="shrink-0 rounded-t-lg px-2.5 py-2 text-[12.5px] font-semibold text-ink-soft transition hover:text-brand"
            >
              Bundles
            </Link>
          </nav>
        </div>
      </header>

      {searchOpen ? <SearchOverlay open onClose={closeSearch} categories={categories} /> : null}
      {menuOpen ? <AisleMenuSheet
        open={menuOpen}
        onClose={closeMenu}
        categories={categories}
        postcode={area.postcode}
        neighbourhood={area.neighbourhood}
        eta={area.eta}
        pathname={pathname}
        user={user}
        onPickArea={() => {
          closeMenu();
          openPicker();
        }}
        onLogout={logout}
      /> : null}    </>
  );
}
