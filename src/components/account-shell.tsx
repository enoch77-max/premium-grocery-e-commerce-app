"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/components/session-provider";
import { useCart } from "@/components/cart-provider";
import { ArrowRightIcon, CartIcon, CheckIcon, ShieldIcon } from "@/components/icons";

const NAV = [
  { href: "/account", label: "Overview", icon: "🏠" },
  { href: "/account/orders", label: "Orders", icon: "📦" },
  { href: "/account/saved", label: "Saved items", icon: "❤️" },
  { href: "/account/addresses", label: "Addresses", icon: "📍" },
  { href: "/account/settings", label: "Profile & security", icon: "⚙️" },
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
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        <div className="shimmer h-8 w-48 rounded-lg" />
        <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="shimmer h-64 rounded-2xl" />
          <div className="space-y-3">
            <div className="shimmer h-28 rounded-2xl" />
            <div className="shimmer h-56 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-2xl">🔐</div>
        <h1 className="mt-3 font-display text-2xl font-semibold">Sign in to view your account</h1>
        <p className="mt-1.5 text-[12.5px] text-ink-soft">Taking you to the sign-in page…</p>
        <Link
          href="/login"
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
  const { user, logout } = useSession();
  const { cart, openCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Your account</p>
          <h1 className="mt-1 font-display text-[30px] font-semibold leading-none tracking-[-0.02em] sm:text-[36px]">
            {pathname === "/account" ? `Hello, ${user?.name.split(" ")[0] ?? "shopper"}` : navTitle(pathname)}
          </h1>
          <p className="mt-1.5 text-[12px] text-ink-soft">
            {cart?.itemCount
              ? `${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"} waiting in your basket`
              : "Your basket is empty — start with this week's produce"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCart}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand"
          >
            <CartIcon className="h-4 w-4" /> Basket{cart?.itemCount ? ` (${cart.itemCount})` : ""}
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3 text-[11.5px] font-bold text-cream hover:bg-brand-deep"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-[126px] lg:self-start">
          <div className="rounded-2xl border border-line/80 bg-white p-3">
            <div className="flex items-center gap-2.5 border-b border-line/70 pb-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-[13px] font-extrabold text-brand-deep">
                {initials(user?.name ?? "")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-bold text-ink">{user?.name}</p>
                <p className="truncate text-[10.5px] text-ink-soft">{user?.email}</p>
              </div>
            </div>
            <nav className="mt-2 space-y-0.5">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold transition ${
                      active ? "bg-brand-soft/70 text-brand-deep" : "text-ink hover:bg-cream"
                    }`}
                  >
                    <span className="text-[14px]">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {active ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                  </Link>
                );
              })}
            </nav>
            <Link
              href="/offers"
              className="mt-2 flex items-center justify-between rounded-xl bg-cream px-2.5 py-2 text-[11.5px] font-bold text-ink hover:bg-cream-deep"
            >
              🎁 Offers & coupons <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-2 rounded-2xl border border-line/80 bg-cream-deep/50 p-3">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
              <ShieldIcon className="h-3.5 w-3.5 text-brand" /> Account promise
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-soft">
              We never sell your data. Orders, addresses and saved items stay private to you.
            </p>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">{children}</div>
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
