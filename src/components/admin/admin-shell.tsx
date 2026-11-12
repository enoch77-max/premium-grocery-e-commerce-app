"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { AdminUser } from "@/lib/admin";
import { MenuIcon } from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/orders", label: "Orders", icon: "📦" },
  { href: "/admin/products", label: "Catalogue", icon: "🥬" },
  { href: "/admin/customers", label: "Customers", icon: "👥" },
  { href: "/admin/recurring", label: "Recurring", icon: "🔁" },
  { href: "/admin/settings", label: "Store settings", icon: "⚙️" },
];

export function AdminShell({ admin, children }: { admin: AdminUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-[1240px] 2xl:max-w-[1440px] px-3 pb-10 pt-4 sm:px-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-ink px-4 py-3 text-cream">
        <div className="min-w-0">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-lime">
            Fresco store control
          </p>
          <p className="truncate text-[13px] font-bold">
            {admin.name} · <span className="font-medium text-cream/60">{admin.role}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="press hidden h-9 items-center rounded-full bg-white/10 px-3 text-[11.5px] font-bold hover:bg-white/20 sm:flex"
          >
            View shop
          </Link>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.replace("/admin/login");
              router.refresh();
            }}
            className="press flex h-9 items-center rounded-full bg-lime px-3 text-[11.5px] font-bold text-brand-deep"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="press grid h-9 w-9 place-items-center rounded-full bg-white/10 md:hidden"
            aria-label="Toggle dashboard menu"
            aria-expanded={open}
          >
            <MenuIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-[210px_1fr]">
        <nav className={`${open ? "block" : "hidden"} md:block`} aria-label="Dashboard sections">
          <div className="sticky top-[120px] space-y-1 rounded-2xl border border-line bg-white p-2">
            {NAV.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[44px] items-center gap-2.5 rounded-xl px-2.5 text-[13px] font-semibold ${
                    active ? "bg-brand-soft/70 text-brand-deep" : "text-ink hover:bg-cream"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
