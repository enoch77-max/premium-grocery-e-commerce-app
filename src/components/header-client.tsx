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
import { initials } from "@/components/account-shell";
import { SearchOverlay } from "@/components/search-overlay";
import { BottomSheet } from "@/components/bottom-sheet";
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
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  const count = cart?.itemCount ?? 0;
  const subtotal = cart?.subtotalCents ?? 0;

  return (
    <>
      <div className="hide-in-landscape bg-brand-deep text-cream">
        <div className="mx-auto flex max-w-[1340px] items-center justify-between gap-3 px-3 py-2 text-[11px] font-medium sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <BoltIcon className="h-3.5 w-3.5 shrink-0 text-lime" />
            <span className="truncate font-semibold">{announcement}</span>
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
            className="group inline-flex shrink-0 items-center gap-1.5 font-semibold text-cream hover:text-lime"
          >
            Today&apos;s offers
            <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {!storeOpen ? (
        <div className="bg-rose-soft px-4 py-2 text-center text-[11.5px] font-bold text-clay">
          We are paused for a short restock — ordering reopens very soon.
        </div>
      ) : null}

      <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[1340px] px-3 sm:px-6">
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
              className="press hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink hover:border-brand md:flex xl:hidden"
              aria-label="Change delivery area"
            >
              <PinIcon className="h-3.5 w-3.5 text-brand" />
              {area.postcode}
              <ChevronDownIcon className="h-3 w-3 text-ink-soft" />
            </button>

            {/* Nearest-neighbourhood chip: only when a phone is wide enough for it. */}
            <button
              type="button"
              onClick={openPicker}
              className="press hidden h-8 shrink-0 items-center gap-1 rounded-full border border-line bg-white px-2 text-[10.5px] font-bold text-ink hover:border-brand min-[380px]:flex md:hidden"
              aria-label={`Deliver to ${area.neighbourhood} ${area.postcode}. Change`}
            >
              <PinIcon className="h-3 w-3 text-brand" />
              <span className="max-w-[74px] truncate">{area.postcode}</span>
            </button>

            <button
              type="button"
              onClick={openSearch}
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

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {/* Only appears when the landscape header drops the search row. */}
              <button
                type="button"
                onClick={openSearch}
                className="press tap-xl hidden place-items-center rounded-full text-ink hover:bg-cream-deep show-in-landscape"
                aria-label="Search"
              >
                <SearchIcon className="h-5 w-5" />
              </button>

              <div className="relative hidden sm:block">
                <AccountMenu user={user} onLogout={logout} />
              </div>

              <button
                type="button"
                onClick={openCart}
                className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-cream hover:bg-brand-deep sm:flex sm:h-11 sm:w-auto sm:items-center sm:gap-2.5 sm:py-0 sm:pr-4 sm:pl-3"
                aria-label={count > 0 ? `Open basket, ${count} items, ${formatMoney(subtotal)}` : "Open basket"}
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
                  <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-cream/60">Basket</span>
                  <span className="text-[12.5px] font-bold">{formatMoney(subtotal)}</span>
                </span>
              </button>
            </div>
          </div>

          <div className="hide-in-landscape pb-2 sm:hidden">
            <button
              type="button"
              onClick={openSearch}
              className="press flex h-10 w-full items-center gap-2 rounded-full border border-line bg-white px-3.5 text-left shadow-[0_1px_0_rgba(19,38,29,0.03)]"
            >
              <SearchIcon className="h-4 w-4 shrink-0 text-brand" />
              <span className="truncate text-[13px] text-ink-soft/80">Search groceries — try &ldquo;vegan snacks&rdquo;</span>
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

      <SearchOverlay open={searchOpen} onClose={closeSearch} categories={categories} />

      <BottomSheet
        open={menuOpen}
        onClose={closeMenu}
        title="Shop by aisle"
        subtitle={`${categories.length} aisles · delivered in ${area.eta}`}
        zIndex="z-[75]"
        footer={
          <div className="flex items-center gap-2">
            <Link
              href="/offers"
              onClick={closeMenu}
              className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand text-[13px] font-bold text-white"
            >
              This week&apos;s offers <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/track"
              onClick={closeMenu}
              className="press flex h-11 items-center justify-center rounded-full border border-line px-4 text-[13px] font-bold text-ink"
            >
              Track
            </Link>
          </div>
        }
      >
        <button
          type="button"
          onClick={() => {
            closeMenu();
            openPicker();
          }}
          className="press flex w-full items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-3 text-left"
        >
          <PinIcon className="h-4 w-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="block text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Delivering to</span>
            <span className="block truncate text-[13px] font-bold text-ink">
              {area.neighbourhood}, {area.postcode}
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
                onClick={closeMenu}
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
            onClick={closeMenu}
            className="press flex min-h-[48px] items-center gap-2 rounded-2xl border border-line bg-white px-3 text-[12.5px] font-bold text-ink"
          >
            🧺 Bundles
          </Link>
          <Link
            href="/search?q=organic"
            onClick={closeMenu}
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
                  onClick={closeMenu}
                  className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-1.5 text-[13px] font-semibold hover:bg-cream"
                >
                  <span aria-hidden>{item.icon}</span> {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={async () => {
                  closeMenu();
                  await logout();
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
                  onClick={closeMenu}
                  className="press flex h-10 flex-1 items-center justify-center rounded-full bg-brand text-[12.5px] font-bold text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/login?mode=create"
                  onClick={closeMenu}
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
    </>
  );
}

function AccountMenu({
  user,
  onLogout,
}: {
  user: ReturnType<typeof useSession>["user"];
  onLogout: () => Promise<void>;
}) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAccountOpen((value) => !value)}
        className="press flex h-10 items-center gap-2 rounded-full px-2.5 text-[12.5px] font-semibold text-ink hover:bg-cream-deep"
        aria-label={user ? `Account menu for ${user.name}` : "Account menu"}
        aria-expanded={accountOpen}
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
                {ACCOUNT_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream"
                  >
                    {item.icon} {item.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-line/70" />
                <button
                  type="button"
                  onClick={async () => {
                    setAccountOpen(false);
                    await onLogout();
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
                  onClick={() => setAccountOpen(false)}
                  className="press mt-1 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand text-[12px] font-bold text-white hover:bg-brand-deep"
                >
                  Sign in <ArrowRightIcon className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/login?mode=create"
                  onClick={() => setAccountOpen(false)}
                  className="press mt-1.5 flex h-9 items-center justify-center rounded-lg border border-line text-[12px] font-bold text-ink hover:border-brand hover:text-brand"
                >
                  Create account
                </Link>
                <div className="my-1.5 h-px bg-line/70" />
                {GUEST_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-2 py-2 text-[12.5px] font-semibold text-ink hover:bg-cream"
                  >
                    {item.icon} {item.label}
                  </Link>
                ))}
              </>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}

const ACCOUNT_LINKS = [
  { href: "/account", label: "Account overview", icon: "🏠" },
  { href: "/account/orders", label: "Orders & reordering", icon: "📦" },
  { href: "/account/saved", label: "Saved items", icon: "❤️" },
  { href: "/account/addresses", label: "Addresses", icon: "📍" },
  { href: "/account/settings", label: "Profile & security", icon: "⚙️" },
];

const GUEST_LINKS = [
  { href: "/track", label: "Track an order", icon: "🚚" },
  { href: "/offers", label: "Offers & coupons", icon: "🎁" },
  { href: "/info/contact", label: "Help & contact", icon: "💬" },
];
