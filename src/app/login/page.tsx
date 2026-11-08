"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import { useCart } from "@/components/cart-provider";
import { ArrowRightIcon, CheckIcon, LeafIcon, ShieldIcon, SparkleIcon, TruckIcon } from "@/components/icons";

const DEMO = { email: "jordan@fresco.demo", password: "frescodemo" };

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const { login, register, loginDemo, user, loading } = useSession();
  const { cart, refresh: refreshCart } = useCart();
  const [mode, setMode] = useState<"signin" | "create">(params.get("mode") === "create" ? "create" : "signin");
  const [form, setForm] = useState({ name: "", email: "", password: "", marketing: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        ? await register(form.name.trim(), form.email.trim(), form.password, form.marketing)
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
    setForm({ name: "", email: DEMO.email, password: DEMO.password, marketing: true });
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
              <p className="rounded-xl bg-rose-soft px-3 py-2 text-[11.5px] font-semibold text-clay">{message}</p>
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

          <button
            type="button"
            onClick={() => void signInAsDemo()}
            disabled={busy}
            className="press mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/40 bg-brand-soft/40 px-3 py-2 text-[11px] font-bold text-brand-deep hover:border-brand hover:bg-brand-soft disabled:opacity-60"
          >
            {busy ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-deep border-t-transparent" />
            ) : null}
            Sign in with the demo account (one click)
          </button>
          <p className="mt-1 text-center text-[10px] text-ink-soft">
            {DEMO.email} · {DEMO.password}
          </p>

          <p className="mt-3 flex items-center justify-center gap-1 text-[10.5px] text-ink-soft">
            <ShieldIcon className="h-3.5 w-3.5" /> Passwords are salted and hashed — never stored in plain text.
          </p>
          <p className="mt-1 text-center text-[11px] text-ink-soft">
            Just browsing?{" "}
            <Link href="/checkout" className="font-bold text-brand hover:underline">
              Check out as a guest
            </Link>
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-[26px] bg-[#13261d] p-5 text-cream sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-lime">Why create an account</p>
            <div className="mt-3 space-y-3">
              {[
                { title: "Basket follows you", note: "Add on your phone, finish on your laptop." },
                { title: "One-tap reorder", note: "Repeat last week's shop in a single tap." },
                { title: "Saved addresses", note: "Switch between home, work and a neighbour." },
                { title: "Full order history", note: "Track, cancel or reorder — receipts kept safe." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-brand-deep">
                    <CheckIcon className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-[12px] font-bold">{item.title}</p>
                    <p className="text-[10.5px] text-cream/70">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
            {cart?.itemCount ? (
              <div className="mt-4 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-lime">
                  <SparkleIcon className="h-3 w-3" /> Your basket travels with you
                </p>
                <p className="text-[10.5px] text-cream/70">
                  {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"} ({cart.subtotalCents ? `$${(cart.subtotalCents / 100).toFixed(2)}` : ""}) will be
                  waiting after you sign in.
                </p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2 text-[10.5px] text-cream/60">
              <span className="inline-flex items-center gap-1">
                <TruckIcon className="h-3.5 w-3.5" /> 30-minute slots
              </span>
              <span className="inline-flex items-center gap-1">
                <LeafIcon className="h-3.5 w-3.5" /> Freshness guarantee
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-line/80 bg-white p-4">
            <p className="text-[11px] font-bold text-ink">Guest checkout is always available</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-soft">
              No account required to order. If you register later with the same email, past guest orders appear in your
              history automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className={`h-10 w-full rounded-xl border px-3 text-[13px] outline-none transition ${
          error ? "border-clay/60 bg-rose-soft/40" : "border-line bg-cream/40 focus:border-brand focus:bg-white"
        }`}
      />
      {error ? <p className="mt-0.5 text-[10px] font-semibold text-clay">{error}</p> : null}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-ink-soft">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}
