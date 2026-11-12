import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password — Fresco",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand">Account recovery</p>
      <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight">
        Forgot your password?
      </h1>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
        Enter the email you shop with and we&apos;ll send a link to set a new password.
      </p>
      <Suspense fallback={<div className="shimmer mt-5 h-40 rounded-2xl" />}>
        <ForgotPasswordForm />
      </Suspense>
      <p className="mt-4 text-[12px] text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
