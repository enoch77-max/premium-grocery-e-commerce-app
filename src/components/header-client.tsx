"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { useDelivery } from "@/components/delivery-provider";
import { useSession } from "@/components/session-provider";
import { initials } from "@/components/account-shell";
import { SearchOverlay } from "@/components/search-overlay";
import {
  ArrowRightIcon,
  BoltIcon,
  CartIcon,
  ChevronDownIcon,
  CloseIcon,
  LeafIcon,
  MenuIcon,
  PinIcon,
  SearchIcon,
  SparkleIcon,
  TruckIcon,
  UserIcon,
} from "@/components/icons";

export function HeaderClient({ categories }: { categories: Category[] }) {
  const { cart, openCart, pulse } = useCart();
  const { area, openPicker } = useDelivery();
  const { user, logout } = useSession();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const count = cart?.itemCount ?? 0;
  const subtotal = cart?.subtotalCents ?? 0;

  return (
    <>
      <div className="bg-brand-deep text-cream">
        <div className="mx-auto flex max-w-[1340px] items-center justify-between gap-3 px-4 py-2 text-[11px] font-medium sm:px-6">
          <div className="flex items-center gap-2">
            <BoltIcon className="h-3.5 w-3.5 text-lime" />
            <span className="font-semibold">Free delivery over $35</span>
            <span className="hidden text-cream/50 sm:inline">·</span>
            <span className="hidden text-cream/80 sm:inline">30-minute slots, 7 days a week</span>
          </div>
          <div className="hidden items-center gap-5 text-cream/75 lg:flex">
            <span className="inline-flex items-center gap-1.5">
              <LeafIcon className="h-3.5 w-3.5" /> Farm-fresh guarantee
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TruckIcon className="h-3.5 w-3.5" /> Contactless delivery
            </span>
          </div>
          <Link
            href="/offers"
            className="group inline-flex items-center gap-1.5 font-semibold text-cream hover:text-lime"
          >
            Today&apos;s offers
            <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1340px] px-4 sm:px-6">
          <div className="flex h-16 items-center gap-3 sm:h-[74px] sm:gap-4">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="press -ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-cream-deep lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>

            <Link href="/" className="group flex shrink-0 items-center gap-2">
              <span className="relative grid h-9 w-9 place-items-center rounded-[13px] bg-brand text-lime shadow-[0_6px_16px_-8px_rgba(15,122,77,0.9)] transition group-hover:rotate-3">
                <LeafIcon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-[26px] font-semibold tracking-[-0.03em] text-ink">fresco</span>
                <span className="mt-0.5 hidden text-[9px] font-bold uppercase tracking-[0.22em] text-ink-soft sm:block">
                  green grocer
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={openPicker}
              className="press hidden items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-cream-deep/70 xl:flex"
              aria-label={`Delivering to ${area.neighbourhood} ${area.postcode}. Change delivery area`}
            >
              <PinIcon className="h-4 w-4 text-brand" />
              <span className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">Deliver to</span>
                <span className="text-[12.5px] font-bold text-ink">
                  {area.neighbourhood} {area.postcode}
                </span>
              </span>
              <ChevronDownIcon className="h-3.5 w-3.5 text-ink-soft" />
            </button>

            <button
              type="button"
              onClick={openPicker}
              className="press hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink hover:border-brand xl:hidden md:flex"
              aria-label="Change delivery area"
            >
              <PinIcon className="h-3.5 w-3.5 text-brand" />
              {area.postcode}
              <ChevronDownIcon className="h-3 w-3 text-ink-soft" />
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="press group hidden h-11 flex-1 items-center gap-2.5 rounded-full border border-line bg-white px-4 text-left shadow-[0_1px_0_rgba(19,38,29,0.03)] hover:border-brand/50 hover:shadow-soft sm:flex"
            >
              <SearchIcon className="h-4.5 w-4.5 text-brand" />
              <span className="flex-1 truncate text-[13px] text-ink-soft/80">
                Search milk, avocados, sourdough — or ask &ldquo;dinner under $15&rdquo;
              </span>
              <span className="hidden items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft md:inline-flex">
                ⌘K
              </span>
            </button>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="press grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-cream-deep sm:hidden"
                aria-label="Search"
              >
                <SearchIcon className="h-5 w-5" />
              </button>

              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAccountOpen((value) => !value)}
                  className="press flex h-10 items-center gap-2 rounded-full px-2.5 text-[12.5px] font-semibold text-ink hover:bg-cream-deep"
                  aria-label={user ? `Account menu for ${user.name}` : "Account menu"}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-cream-deep text-[11px] font-bold text-brand-deep">
                    {user ? initials(user.name) : <UserIcon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="hidden lg:block">{user ? user.name.split(" ")[0] : "Account"}</span>
                  <ChevronDownIcon className="hidden h-3.5 w-3.5 text-ink-soft lg:block" />
                </button>
                {accountOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="Close account menu"
                      onClick={() => setAccountOpen(false)}
                    />
                    <div className="animate-scale-in absolute right-0 top-12 z-20 w-64 rounded-2xl border border-line bg-white p-2 shadow-lift">
                      {user ? (
                        <>
                          <div className="px-2 py-1.5">
                            <p className="truncate text-[12.5px] font-bold text-ink">{user.name}</p>
                            <p className="truncate text-[10.5px] text-ink-soft">{user.email}</p>
                          </div>
                          <div className="my-1 h-px bg-line/70" />
                          <Link href="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream">
                            🏠 Account overview
                          </Link>
                          <Link href="/account/orders" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream">
                            📦 Orders & reordering
                          </Link>
                          <Link href="/account/saved" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream">
                            ❤️ Saved items
                          </Link>
                          <Link href="/account/addresses" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream">
                            📍 Addresses
                          </Link>
                          <Link href="/account/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream">
                            ⚙️ Profile & security
                          </Link>
                          <div className="my-1 h-px bg-line/70" />
                          <button
                            type="button"
                            onClick={async () => {
                              setAccountOpen(false);
                              await logout();
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[12.5px] font-semibold text-ink-soft hover:bg-rose-soft hover:text-clay"
                          >
                            Sign out
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="px-2 py-1.5">
                            <p className="text-[12.5px] font-bold text-ink">Guest shopper</p>
                            <p className="text-[10.5px] leading-relaxed text-ink-soft">
                              Your basket saves automatically — no sign-in required to check out.
                            </p>
                          </div>
                          <div className="my-1 h-px bg-line/70" />
                          <Link
                            href="/login"
                            className="press mt-1 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand text-[12px] font-bold text-white hover:bg-brand-deep"
                          >
                            Sign in <ArrowRightIcon className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href="/login?mode=create"
                            className="press mt-1.5 flex h-9 items-center justify-center rounded-lg border border-line text-[12px] font-bold text-ink hover:border-brand hover:text-brand"
                          >
                            Create account
                          </Link>
                          <div className="my-1.5 h-px bg-line/70" />
                          <Link href="/track" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream">
                            🚚 Track an order
                          </Link>
                          <Link href="/offers" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream">
                            🎁 Offers & coupons
                          </Link>
                          <Link href="/info/contact" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream">
                            💬 Help & contact
                          </Link>
                        </>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

                            <button
                type="button"
                onClick={openCart}
                className="press flex h-11 items-center gap-2.5 rounded-full bg-ink pr-4 pl-3 text-cream hover:bg-brand-deep"
                aria-label="Open basket"
              >
                <span className="relative">
                  <CartIcon className="h-5 w-5" />
                  {count > 0 ? (
                    <span
                      key={`${pulse}-${count}`}
                      className="animate-pop absolute -right-2 -top-2 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-lime px-1 text-[10px] font-extrabold text-ink"
                    >
                      {count}
                    </span>
                  ) : null}
                </span>
                <span className="hidden flex-col items-start leading-tight md:flex">
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-cream/60">Basket</span>
                  <span className="text-[12.5px] font-bold">{formatMoney(subtotal)}</span>
                </span>
              </button>
            </div>
          </div>

          <div className="pb-2.5 sm:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="press flex h-10 w-full items-center gap-2 rounded-full border border-line bg-white px-3.5 text-left shadow-[0_1px_0_rgba(19,38,29,0.03)]"
            >
              <SearchIcon className="h-4 w-4 text-brand" />
              <span className="truncate text-[12.5px] text-ink-soft/80">Search groceries — try &ldquo;vegan snacks&rdquo;</span>
            </button>
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

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} categories={categories} />

      {menuOpen ? (
        <div className="fixed inset-0 z-[75] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <div className="animate-scale-in absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col bg-cream p-5 shadow-lift">
            <div className="flex items-center justify-between">
              <span className="font-display text-2xl font-semibold">fresco</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="press grid h-9 w-9 place-items-center rounded-full bg-white"
                aria-label="Close menu"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openPicker();
              }}
              className="press mt-3 flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-left"
            >
              <PinIcon className="h-4 w-4 text-brand" />
              <span className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Delivering to</span>
                <span className="block truncate text-[12px] font-bold text-ink">
                  {area.neighbourhood}, {area.postcode}
                </span>
              </span>
              <span className="text-[10px] font-bold text-brand">Change</span>
            </button>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">Shop by aisle</p>
            <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-semibold hover:bg-white"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-base">{category.emoji}</span>
                  <span className="flex-1">{category.name}</span>
                  <span className="text-[11px] font-medium text-ink-soft">{category.tagline}</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-line bg-white p-2">
              {user ? (
                <>
                  <p className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                    Signed in as {user.name.split(" ")[0]}
                  </p>
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-1.5 py-2 text-[12.5px] font-semibold hover:bg-cream">
                    🏠 Account overview
                  </Link>
                  <Link href="/account/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-1.5 py-2 text-[12.5px] font-semibold hover:bg-cream">
                    📦 Orders
                  </Link>
                  <Link href="/account/saved" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-1.5 py-2 text-[12.5px] font-semibold hover:bg-cream">
                    ❤️ Saved items
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-lg px-1.5 py-2 text-[12.5px] font-bold text-brand"
                >
                  Sign in or create account <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            <Link
              href="/offers"
              className="press mt-2 flex items-center justify-between rounded-2xl bg-brand px-4 py-3 text-sm font-bold text-white"
            >
              This week&apos;s offers <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-center text-[11px] text-ink-soft">Free delivery over $35 · 30-min slots</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
