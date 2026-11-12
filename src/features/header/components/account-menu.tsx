"use client";

import Link from "next/link";
import { useState } from "react";
import type { useSession } from "@/components/session-provider";
import { initials } from "@/components/account-shell";
import { ArrowRightIcon, ChevronDownIcon, UserIcon } from "@/components/icons";

export function AccountMenu({
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
        <span className="hidden md:block">{user ? user.name.split(" ")[0] : "Account"}</span>
        <ChevronDownIcon className="hidden h-3.5 w-3.5 text-ink-soft md:block" />
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
