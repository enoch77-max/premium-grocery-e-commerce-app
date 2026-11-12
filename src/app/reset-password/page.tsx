import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password — Fresco",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Account recovery</p>
      <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight">
        Set a new password
      </h1>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
        Choose something at least 8 characters long. Every other device will be signed out.
      </p>
      <Suspense fallback={<div className="shimmer mt-5 h-40 rounded-2xl" />}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-4 text-[12px] text-ink-soft">
        Need a fresh link?{" "}
        <Link href="/forgot-password" className="font-bold text-brand hover:underline">
          Request another
        </Link>
      </p>
    </div>
  );
}
