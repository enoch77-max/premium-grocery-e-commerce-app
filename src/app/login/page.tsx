"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import { Field } from "@/features/auth/components/auth-field";
import { LoginAside } from "@/features/auth/components/login-aside";
import { useCart } from "@/components/cart-provider";
import { ArrowRightIcon, CheckIcon, LeafIcon, ShieldIcon, SparkleIcon, TruckIcon } from "@/components/icons";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const { login, register, loginDemo, user, loading } = useSession();
  const { cart, refresh: refreshCart } = useCart();
  const [mode, setMode] = useState<"signin" | "create">(
    params.get("mode") === "create" ? "create" : "signin",
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", marketing: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Whatever this deployment configured via DEMO_EMAIL / DEMO_NAME.
  const [demo, setDemo] = useState<{ enabled: boolean; email: string; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/auth/demo-info", { cache: "no-store" });
        const data = (await response.json()) as { enabled?: boolean; email?: string; name?: string };
        if (!cancelled) {
          setDemo({
            enabled: Boolean(data.enabled),
            email: data.email ?? "",
            name: data.name ?? "",
          });
        }
      } catch {
        if (!cancelled) setDemo({ enabled: false, email: "", name: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, next, router, user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setMessage(null);

    const nextErrors: Record<string, string> = {};
    if (mode === "create" && form.name.trim().length < 2) nextErrors.name = "Tell us your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) nextErrors.email = "Enter a valid email";
    if (form.password.length < 8) nextErrors.password = "Use at least 8 characters";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setBusy(true);
    const result =
      mode === "create"
        ? await register(
            form.name.trim(),
            form.email.trim(),
            form.password,
            form.marketing,
            form.phone.trim(),
          )
        : await login(form.email.trim(), form.password);
    setBusy(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    await refreshCart();
    router.replace(next);
  };

  // Demo sign-in is a single click: fill, submit and redirect.
  const signInAsDemo = async () => {
    setMode("signin");
    setErrors({});
    setMessage(null);
    setBusy(true);
    setForm({ name: "", email: demo?.email ?? "", phone: "", password: "", marketing: true });
    const result = await loginDemo();
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    await refreshCart();
    router.replace(next);
  };

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[26px] border border-line/80 bg-white p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-brand text-lime">
              <LeafIcon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="font-display text-[24px] font-semibold tracking-[-0.03em]">fresco</span>
          </div>

          <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            {mode === "signin"
              ? "Sign in for saved addresses, one-tap reordering and your order history."
              : "One account for your basket, addresses and every order — no app needed."}
          </p>

          <div className="mt-4 flex rounded-full bg-cream p-1">
            {(
              [
                { id: "signin", label: "Sign in" },
                { id: "create", label: "Create account" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setErrors({});
                  setMessage(null);
                }}
                className={`press flex-1 rounded-full py-2 text-[12px] font-bold transition ${
                  mode === tab.id ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-2.5" noValidate>
            {mode === "create" ? (
              <Field
                label="Full name"
                value={form.name}
                onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                placeholder="Jordan Smith"
                error={errors.name}
                autoComplete="name"
              />
            ) : null}
            <Field
              label="Email"
              value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
              placeholder="you@example.com"
              type="email"
              error={errors.email}
              autoComplete="email"
            />
            {mode === "create" ? (
              <Field
                label="Phone (optional — for delivery updates)"
                value={form.phone}
                onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                placeholder="(555) 012-3456"
                type="tel"
                autoComplete="tel"
              />
            ) : null}
            <Field
              label="Password"
              value={form.password}
              onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
              placeholder="At least 8 characters"
              type="password"
              error={errors.password}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
            />

            {mode === "create" ? (
              <label className="flex items-start gap-2 rounded-xl bg-cream/70 px-3 py-2 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={form.marketing}
                  onChange={(event) => setForm((prev) => ({ ...prev, marketing: event.target.checked }))}
                  className="mt-0.5 h-3.5 w-3.5 accent-[#0f7a4d]"
                />
                Email me weekly offers and price drops. You can turn this off any time.
              </label>
            ) : null}

            {message ? (
              <p className="rounded-xl bg-rose-soft px-3 py-2 text-[11.5px] font-semibold text-clay">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-[13px] font-bold text-white hover:bg-brand-deep disabled:opacity-70"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : null}
              {mode === "signin" ? "Sign in" : "Create account & continue"}
              {!busy ? <ArrowRightIcon className="h-4 w-4" /> : null}
            </button>
          </form>

          {mode === "signin" ? (
            <p className="mt-2.5 text-center">
              <Link href="/forgot-password" className="text-[12px] font-bold text-brand hover:underline">
                Forgot your password?
              </Link>
            </p>
          ) : null}

          {demo === null || demo.enabled ? (
            <>
              <button
                type="button"
                onClick={() => void signInAsDemo()}
                disabled={busy || demo === null}
                className="press mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/40 bg-brand-soft/40 px-3 py-2 text-[11px] font-bold text-brand-deep hover:border-brand hover:bg-brand-soft disabled:opacity-60"
              >
                {busy ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-deep border-t-transparent" />
                ) : (
                  <SparkleIcon className="h-3.5 w-3.5 text-amber" />
                )}
                Sign in as the demo shopper{demo?.name ? ` (${demo.name})` : ""}
              </button>
              <p className="mt-1 text-center text-[10px] text-ink-soft">
                {demo?.email
                  ? `${demo.email} · password: ${demo.name ? "set by the store" : "frescodemo"}`
                  : "Checking demo availability…"}
              </p>
            </>
          ) : null}

          <p className="mt-3 flex items-center justify-center gap-1 text-[10.5px] text-ink-soft">
            <ShieldIcon className="h-3.5 w-3.5" /> Passwords are salted and hashed — never stored in plain
            text.
          </p>
          <p className="mt-1 text-center text-[11px] text-ink-soft">
            Just browsing?{" "}
            <Link href="/checkout" className="font-bold text-brand hover:underline">
              Check out as a guest
            </Link>
          </p>
        </div>

        <LoginAside />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-ink-soft">Loading…</div>}
    >
      <LoginContent />
    </Suspense>
  );
}
