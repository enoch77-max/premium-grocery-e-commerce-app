import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fresco — Staff sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect("/admin");
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-line bg-white p-6 shadow-card">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Store control</p>
        <h1 className="mt-1 font-display text-[26px] font-semibold leading-tight tracking-tight">Staff sign in</h1>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
          Owner and staff accounts only. Customer accounts cannot open the dashboard.
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
