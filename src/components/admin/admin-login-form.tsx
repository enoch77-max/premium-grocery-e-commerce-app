"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = (await response.json()) as { error?: string; user?: { role?: string } };
          if (!response.ok) throw new Error(data.error ?? "Sign in failed");
          if (!["admin", "staff"].includes(data.user?.role ?? "")) {
            throw new Error("This account does not have dashboard access.");
          }
          router.replace("/admin");
          router.refresh();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Sign in failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          className="h-11 w-full rounded-xl border border-line bg-cream/40 px-3 text-[15px] outline-none focus:border-brand focus:bg-white sm:text-[13px]"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="h-11 w-full rounded-xl border border-line bg-cream/40 px-3 text-[15px] outline-none focus:border-brand focus:bg-white sm:text-[13px]"
        />
      </label>
      {error ? <p className="rounded-lg bg-rose-soft px-3 py-2 text-[12px] font-semibold text-clay">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="press flex h-11 w-full items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white hover:bg-brand-deep disabled:opacity-70"
      >
        {busy ? "Signing in…" : "Open dashboard"}
      </button>
    </form>
  );
}
