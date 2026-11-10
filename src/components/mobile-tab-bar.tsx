"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { useSession } from "@/components/session-provider";
import { useMobileUi } from "@/components/mobile-ui-provider";
import { AisleIcon, CartIcon, HomeIcon, SearchIcon, UserIcon } from "@/components/icons";

/**
 * Thumb-reach navigation for phones. The desktop header keeps the full aisle
 * nav; on a phone that whole job moves down here where it can be hit one-handed,
 * with the basket total pinned next to the icon so a shopper never has to open
 * the drawer to check where they are.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { openMenu, openSearch, menuOpen, searchOpen } = useMobileUi();
  const { cart, openCart, isOpen } = useCart();
  const { user } = useSession();

  const count = cart?.itemCount ?? 0;
  const subtotal = cart?.subtotalCents ?? 0;

  const linkActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const itemBase =
    "press relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-[9.5px] font-bold leading-none";

  return (
    <nav
      aria-label="Primary"
      className={`fixed inset-x-0 bottom-0 z-[70] lg:hidden ${isOpen || menuOpen || searchOpen ? "pointer-events-none" : ""}`}
    >
      <div className="safe-b border-t border-line bg-cream/95 shadow-[0_-10px_30px_-24px_rgba(19,38,29,0.9)] backdrop-blur-xl">
        <ul className="mx-auto flex max-w-xl items-stretch px-1">
          <li className="flex flex-1">
            <Link
              href="/"
              className={`${itemBase} ${linkActive("/") ? "text-brand-deep" : "text-ink-soft"}`}
              aria-current={linkActive("/") ? "page" : undefined}
            >
              {linkActive("/") ? <ActiveDot /> : null}
              <HomeIcon className="h-[21px] w-[21px]" strokeWidth={linkActive("/") ? 2 : 1.7} />
              Home
            </Link>
          </li>

          <li className="flex flex-1">
            <button
              type="button"
              onClick={openMenu}
              className={`${itemBase} ${menuOpen ? "text-brand-deep" : "text-ink-soft"}`}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <ActiveDot /> : null}
              <AisleIcon className="h-[21px] w-[21px]" strokeWidth={menuOpen ? 2 : 1.7} />
              Aisles
            </button>
          </li>

          <li className="flex flex-1">
            <button
              type="button"
              onClick={openSearch}
              className={`${itemBase} ${searchOpen ? "text-brand-deep" : "text-ink-soft"}`}
              aria-expanded={searchOpen}
            >
              {searchOpen ? <ActiveDot /> : null}
              <SearchIcon className="h-[21px] w-[21px]" strokeWidth={searchOpen ? 2 : 1.7} />
              Search
            </button>
          </li>

          <li className="flex flex-1">
            <Link
              href={user ? "/account" : "/login"}
              className={`${itemBase} ${pathname.startsWith("/account") || pathname.startsWith("/login") ? "text-brand-deep" : "text-ink-soft"}`}
              aria-current={pathname.startsWith("/account") ? "page" : undefined}
            >
              {pathname.startsWith("/account") ? <ActiveDot /> : null}
              <span className="relative">
                {user ? (
                  <span className="grid h-[21px] w-[21px] place-items-center rounded-full bg-brand-soft text-[9px] font-extrabold text-brand-deep">
                    {user.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("")}
                  </span>
                ) : (
                  <UserIcon className="h-[21px] w-[21px]" />
                )}
              </span>
              {user ? user.name.split(" ")[0] : "Account"}
            </Link>
          </li>

          <li className="flex flex-1">
            <button
              type="button"
              onClick={openCart}
              className={`${itemBase} ${isOpen ? "text-brand-deep" : count > 0 ? "text-ink" : "text-ink-soft"}`}
              aria-label={count > 0 ? `Basket, ${count} items, ${formatMoney(subtotal)}` : "Basket, empty"}
            >
              {isOpen ? <ActiveDot /> : null}
              <span className="relative">
                <CartIcon className="h-[21px] w-[21px]" strokeWidth={isOpen || count > 0 ? 2 : 1.7} />
                {count > 0 ? (
                  <span className="absolute -right-2 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-lime px-[3px] text-[9px] font-extrabold leading-none text-ink">
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums">{count > 0 ? formatMoney(subtotal) : "Basket"}</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function ActiveDot() {
  return <span className="absolute inset-x-4 top-0 h-[2.5px] rounded-b-full bg-brand" aria-hidden />;
}
