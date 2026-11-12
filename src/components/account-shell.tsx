"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/components/session-provider";
import { ArrowRightIcon } from "@/components/icons";

/**
 * One navigation model, not three.
 *
 * The account used to offer the same destinations from a tab bar, a shortcut grid
 * and a sidebar, plus basket/sign-out buttons that duplicated the site tab bar.
 * Now there is a single compact nav: a swipeable pill rail under the header on
 * phones (a sidebar on desktop). The overview page alone shows a plain list of
 * destinations instead, because that is the page whose job is "where can I go".
 */

export const ACCOUNT_NAV = [
  { href: "/account", label: "Overview", icon: "🏠" },
  { href: "/account/orders", label: "Orders", icon: "📦" },
  { href: "/account/recurring", label: "Repeating", icon: "🔁" },
  { href: "/account/saved", label: "Saved", icon: "❤️" },
  { href: "/account/addresses", label: "Addresses", icon: "📍" },
  { href: "/account/settings", label: "Settings", icon: "⚙️" },
];

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AccountGate({ children }: { children: ReactNode }) {
  const { user, loading, token, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // `token && !user` means "still verifying", not "signed out".
    if (!loading && !user && !token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, token, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
        <div className="shimmer h-16 rounded-2xl" />
        <div className="mt-3 shimmer h-40 rounded-2xl" />
        <div className="mt-3 shimmer h-32 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Sign in to view your account</h1>
        <p className="mt-1.5 text-[12.5px] text-ink-soft">Taking you to the sign-in page…</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="press mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-[12px] font-bold text-white"
        >
          Go to sign in <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

export function AccountShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const pathname = usePathname();
  const isOverview = pathname === "/account";

  return (
    <div className="mx-auto max-w-[1240px] 2xl:max-w-[1400px] px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      {/* profile strip — identity only, no actions competing with the site chrome */}
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-[14px] font-extrabold text-white">
          {initials(user?.name ?? "")}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[20px] font-semibold leading-tight tracking-tight sm:text-[22px]">
            {isOverview ? `Hi, ${user?.name.split(" ")[0] ?? "there"}` : navTitle(pathname)}
          </h1>
          <p className="truncate text-[11.5px] text-ink-soft">{user?.email}</p>
        </div>
        {!isOverview ? (
          <Link
            href="/account"
            className="press inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand"
          >
            Account
          </Link>
        ) : null}
      </div>

      {/* One nav per breakpoint: swipeable pills on phones, a sticky sidebar on
          desktop — present on every account page so the options never hide. */}
      {/* Phones: quick rail on deep pages only — the overview lists its menu. */}
      {!isOverview ? (
        <nav
          aria-label="Account sections"
          className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto border-b border-line/80 bg-cream/95 px-4 pb-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden"
        >
          {ACCOUNT_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`press flex h-8 shrink-0 items-center rounded-full px-3 text-[12px] font-bold transition ${
                  active ? "bg-ink text-cream" : "border border-line bg-white text-ink-soft"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="mt-4 grid gap-5 lg:grid-cols-[192px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-[128px] rounded-2xl border border-line/80 bg-white p-2">
            <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">
              My account
            </p>
            <div className="space-y-0.5">
              {ACCOUNT_NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[38px] items-center gap-2 rounded-lg px-2.5 text-[12.5px] font-semibold transition ${
                      active ? "bg-brand-soft/70 text-brand-deep" : "text-ink hover:bg-cream"
                    }`}
                  >
                    <span aria-hidden className="text-[13px]">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
        <div className="min-w-0 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function navTitle(pathname: string) {
  if (pathname.startsWith("/account/orders/")) return "Order details";
  if (pathname.startsWith("/account/orders")) return "Your orders";
  if (pathname.startsWith("/account/saved")) return "Saved items";
  if (pathname.startsWith("/account/addresses")) return "Delivery addresses";
  if (pathname.startsWith("/account/settings")) return "Profile & security";
  return "Your account";
}
