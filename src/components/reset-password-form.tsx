"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="mt-5 rounded-2xl border border-clay/30 bg-rose-soft p-4">
        <p className="text-[13px] font-bold text-clay">This reset link is incomplete</p>
        <p className="mt-1 text-[11.5px] text-ink-soft">Open the link from your reset email again, or request a new one.</p>
        <Link href="/forgot-password" className="press mt-3 flex h-11 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-5 rounded-2xl border border-brand/30 bg-brand-soft/50 p-4">
        <p className="text-[13px] font-bold text-brand-deep">Password updated</p>
        <p className="mt-1 text-[11.5px] text-ink-soft">Sign in with your new password to continue shopping.</p>
        <Link href="/login" className="press mt-3 flex h-11 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (password.length < 8) {
          setError("Use at least 8 characters");
          return;
        }
        if (password !== confirm) {
          setError("Those passwords do not match");
          return;
        }
        setBusy(true);
        try {
          const response = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
          });
          const data = (await response.json()) as { ok?: boolean; error?: string };
          if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not reset the password");
          setDone(true);
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Could not reset the password");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">New password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-brand sm:text-[13px]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Confirm password</span>
        <input
          type="password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          className="h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-brand sm:text-[13px]"
        />
      </label>
      {error ? <p className="rounded-lg bg-rose-soft px-3 py-2 text-[12px] font-semibold text-clay">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="press flex h-11 w-full items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white disabled:opacity-70"
      >
        {busy ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
