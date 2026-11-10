"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; link?: string } | null>(null);

  if (result) {
    return (
      <div className="mt-5 rounded-2xl border border-line bg-white p-4">
        <p className="text-[13px] font-bold text-ink">{result.message}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
          The link works once and expires in one hour. Check your spam folder if it does not arrive.
        </p>
        {result.link ? (
          <div className="mt-3 rounded-xl border border-dashed border-brand/40 bg-brand-soft/40 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-deep">
              Email delivery is not configured yet
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              Use this one-time link to continue:
            </p>
            <Link href={result.link} className="mt-2 block truncate text-[12px] font-bold text-brand underline">
              {result.link}
            </Link>
          </div>
        ) : null}
        <Link href="/login" className="press mt-3 flex h-11 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = (await response.json()) as { message?: string; link?: string; error?: string };
          if (!response.ok) throw new Error(data.error ?? "Something went wrong");
          setResult({ message: data.message ?? "Check your inbox.", link: data.link });
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Something went wrong");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-brand sm:text-[13px]"
        />
      </label>
      {error ? <p className="rounded-lg bg-rose-soft px-3 py-2 text-[12px] font-semibold text-clay">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="press flex h-11 w-full items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white disabled:opacity-70"
      >
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
