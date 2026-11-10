"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useSession } from "@/components/session-provider";
import { CheckIcon, ShieldIcon, UserIcon } from "@/components/icons";

export default function SettingsPage() {
  return (
    <AccountGate>
      <AccountShell>
        <Settings />
      </AccountShell>
    </AccountGate>
  );
}

function Settings() {
  const { user, setUser, authFetch, logout } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    marketingOptIn: true,
    orderUpdatesEmail: true,
    orderUpdatesSms: false,
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name,
      email: user.email,
      phone: user.phone,
      marketingOptIn: user.marketingOptIn,
      orderUpdatesEmail: user.orderUpdatesEmail ?? true,
      orderUpdatesSms: user.orderUpdatesSms ?? false,
    });
  }, [user]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileBusy(true);
    setProfileErrors({});
    setProfileMessage(null);
    try {
      const response = await authFetch("/api/account", {
        method: "PATCH",
        body: JSON.stringify(profile),
      });
      const data = (await response.json().catch(() => null)) as
        | { user?: typeof user; errors?: Record<string, string>; error?: string }
        | null;
      if (!response.ok || !data?.user) {
        setProfileErrors(data?.errors ?? {});
        setProfileMessage(data?.error ?? "We couldn't save your details.");
        return;
      }
      setUser(data.user);
      setProfileMessage("Saved — your details are up to date.");
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordErrors({});
    setPasswordMessage(null);
    if (passwords.newPassword !== passwords.confirm) {
      setPasswordErrors({ confirm: "The two new passwords don't match" });
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordErrors({ newPassword: "Use at least 8 characters" });
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await authFetch("/api/account/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; field?: string }
        | null;
      if (!response.ok) {
        setPasswordErrors(data?.field ? { [data.field]: data.error ?? "Check this field" } : {});
        setPasswordMessage(data?.error ?? "We couldn't update your password.");
        return;
      }
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
      setPasswordMessage("Password updated. Use it next time you sign in.");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <>
      <form onSubmit={saveProfile} className="rounded-2xl border border-line/80 bg-white p-4">
        <h2 className="inline-flex items-center gap-1.5 font-display text-[20px] font-semibold tracking-tight">
          <UserIcon className="h-4 w-4 text-brand" /> Profile details
        </h2>
        <p className="text-[11px] text-ink-soft">Used to prefill checkout and send order receipts.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <Field label="Full name" value={profile.name} onChange={(value) => setProfile({ ...profile, name: value })} error={profileErrors.name} />
          <Field
            label="Email"
            value={profile.email}
            onChange={(value) => setProfile({ ...profile, email: value })}
            error={profileErrors.email}
            type="email"
          />
          <Field
            label="Phone (optional)"
            value={profile.phone}
            onChange={(value) => setProfile({ ...profile, phone: value })}
            error={profileErrors.phone}
            placeholder="(555) 012-3456"
          />
          <label className="flex items-end gap-2 pb-1 text-[11px] font-semibold text-ink">
            <input
              type="checkbox"
              checked={profile.marketingOptIn}
              onChange={(event) => setProfile({ ...profile, marketingOptIn: event.target.checked })}
              className="h-3.5 w-3.5 accent-[#0f7a4d]"
            />
            Email me weekly offers
          </label>
        </div>
        {profileMessage ? (
          <p className="mt-2 rounded-xl bg-brand-soft/70 px-3 py-2 text-[11px] font-semibold text-brand-deep">{profileMessage}</p>
        ) : null}
        <button
          type="submit"
          disabled={profileBusy}
          className="press mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[11.5px] font-bold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {profileBusy ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <CheckIcon className="h-3.5 w-3.5" />
          )}
          Save changes
        </button>
      </form>

      <form onSubmit={changePassword} className="rounded-2xl border border-line/80 bg-white p-4">
        <h2 className="inline-flex items-center gap-1.5 font-display text-[20px] font-semibold tracking-tight">
          <ShieldIcon className="h-4 w-4 text-brand" /> Password &amp; security
        </h2>
        <p className="text-[11px] text-ink-soft">Changing your password keeps you signed in on this device.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <Field
            label="Current password"
            value={passwords.currentPassword}
            onChange={(value) => setPasswords({ ...passwords, currentPassword: value })}
            error={passwordErrors.currentPassword}
            type="password"
          />
          <Field
            label="New password"
            value={passwords.newPassword}
            onChange={(value) => setPasswords({ ...passwords, newPassword: value })}
            error={passwordErrors.newPassword}
            type="password"
          />
          <Field
            label="Confirm new password"
            value={passwords.confirm}
            onChange={(value) => setPasswords({ ...passwords, confirm: value })}
            error={passwordErrors.confirm}
            type="password"
          />
        </div>
        {passwordMessage ? (
          <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-[11px] font-semibold text-ink">{passwordMessage}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={passwordBusy}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[11.5px] font-bold text-cream hover:bg-brand-deep disabled:opacity-60"
          >
            {passwordBusy ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream border-t-transparent" />
            ) : (
              <ShieldIcon className="h-3.5 w-3.5" />
            )}
            Update password
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="press inline-flex h-9 items-center rounded-full border border-line px-4 text-[11.5px] font-bold text-ink-soft hover:border-clay hover:text-clay"
          >
            Sign out of this device
          </button>
        </div>
        <p className="mt-2 text-[10px] text-ink-soft">
          Sessions expire after 30 days. Passwords are hashed with scrypt and a per-user salt.
        </p>
      </form>

      <NotificationPreferences
        value={{ email: profile.orderUpdatesEmail, sms: profile.orderUpdatesSms }}
        onChange={(next) => {
          setProfile((prev) => ({ ...prev, orderUpdatesEmail: next.email, orderUpdatesSms: next.sms }));
          void authFetch("/api/account", {
            method: "PATCH",
            body: JSON.stringify({ orderUpdatesEmail: next.email, orderUpdatesSms: next.sms }),
          });
        }}
        phone={profile.phone}
      />

      <ActiveSessions authFetch={authFetch} />

      <DangerZone authFetch={authFetch} userEmail={user?.email ?? ""} />
    </>
  );
}

function NotificationPreferences({
  value,
  onChange,
  phone,
}: {
  value: { email: boolean; sms: boolean };
  onChange: (next: { email: boolean; sms: boolean }) => void;
  phone: string;
}) {
  const rows = [
    {
      id: "email" as const,
      title: "Order updates by email",
      note: "Confirmation, packed and delivered notices.",
      disabled: false,
    },
    {
      id: "sms" as const,
      title: "Order updates by SMS",
      note: phone ? "Texts the driver's arrival to this number." : "Add a phone number above to enable texts.",
      disabled: !phone,
    },
  ];
  return (
    <section className="rounded-2xl border border-line/80 bg-white p-4">
      <h2 className="font-display text-[20px] font-semibold tracking-tight">Notifications</h2>
      <p className="text-[11px] text-ink-soft">Choose how we tell you about an order. Saved instantly.</p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <label
            key={row.id}
            className={`flex items-center gap-3 rounded-xl border border-line/80 px-3 py-2.5 ${
              row.disabled ? "opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={value[row.id]}
              disabled={row.disabled}
              onChange={(event) => onChange({ ...value, [row.id]: event.target.checked })}
              className="h-4 w-4 accent-[#0f7a4d]"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold text-ink">{row.title}</span>
              <span className="block text-[10.5px] text-ink-soft">{row.note}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function ActiveSessions({ authFetch }: { authFetch: (input: string, init?: RequestInit) => Promise<Response> }) {
  const [sessions, setSessions] = useState<{ id: number; device: string; createdAt: string; current: boolean }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await authFetch("/api/account/sessions");
      const data = (await response.json().catch(() => null)) as
        | { sessions?: { id: number; device: string; createdAt: string; current: boolean }[] }
        | null;
      if (!cancelled && data?.sessions) setSessions(data.sessions);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  return (
    <section className="rounded-2xl border border-line/80 bg-white p-4">
      <h2 className="font-display text-[20px] font-semibold tracking-tight">Where you&apos;re signed in</h2>
      <p className="text-[11px] text-ink-soft">Sign out any device you don&apos;t recognise.</p>
      <ul className="mt-3 space-y-1.5">
        {sessions.length === 0 ? <li className="text-[12px] text-ink-soft">Loading…</li> : null}
        {sessions.map((session) => (
          <li key={session.id} className="flex items-center justify-between gap-2 rounded-xl bg-cream/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-ink">
                {session.device}
                {session.current ? <span className="ml-1.5 rounded-full bg-brand-soft px-1.5 text-[9px] font-extrabold uppercase text-brand-deep">This device</span> : null}
              </p>
              <p className="text-[10px] text-ink-soft">{new Date(session.createdAt).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy || sessions.length <= 1}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          try {
            const response = await authFetch("/api/account/sessions", { method: "DELETE" });
            const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
            setMessage(response.ok ? data?.message ?? "Other devices signed out" : data?.error ?? "Could not sign out");
            if (response.ok) {
              const refreshed = await authFetch("/api/account/sessions");
              const next = (await refreshed.json().catch(() => null)) as { sessions?: typeof sessions } | null;
              if (next?.sessions) setSessions(next.sessions);
            }
          } finally {
            setBusy(false);
          }
        }}
        className="press mt-3 inline-flex h-9 items-center rounded-full border border-line px-3.5 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand disabled:opacity-50"
      >
        {busy ? "Signing out…" : "Sign out other devices"}
      </button>
      {message ? <p className="mt-2 text-[11px] font-semibold text-brand">{message}</p> : null}
    </section>
  );
}

function DangerZone({
  authFetch,
  userEmail,
}: {
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  userEmail: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className="rounded-2xl border border-clay/30 bg-rose-soft/40 p-4">
      <h2 className="font-display text-[20px] font-semibold tracking-tight text-clay">Close account</h2>
      <p className="text-[11px] leading-relaxed text-ink-soft">
        Permanently removes your profile, addresses and saved items. Order records are kept anonymised for accounting.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press mt-2 inline-flex h-9 items-center rounded-full border border-clay/40 bg-white px-3.5 text-[11.5px] font-bold text-clay"
        >
          Close my account
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-semibold text-ink">Signed in as {userEmail}</p>
          <Field label="Password" value={password} onChange={setPassword} type="password" />
          <Field label='Type DELETE to confirm' value={confirm} onChange={setConfirm} />
          {error ? <p className="text-[11px] font-semibold text-clay">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const response = await authFetch("/api/account/delete", {
                    method: "POST",
                    body: JSON.stringify({ password, confirm }),
                  });
                  const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
                  if (!response.ok || !data?.ok) throw new Error(data?.error ?? "Could not close the account");
                  router.replace("/?closed=1");
                  router.refresh();
                } catch (deleteError) {
                  setError(deleteError instanceof Error ? deleteError.message : "Could not close the account");
                } finally {
                  setBusy(false);
                }
              }}
              className="press inline-flex h-9 items-center rounded-full bg-clay px-4 text-[11.5px] font-bold text-white disabled:opacity-60"
            >
              {busy ? "Closing…" : "Permanently close"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="press inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-[11.5px] font-bold text-ink"
            >
              Keep my account
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        className={`h-10 w-full rounded-xl border px-3 text-[13px] outline-none transition ${
          error ? "border-clay/60 bg-rose-soft/40" : "border-line bg-cream/40 focus:border-brand focus:bg-white"
        }`}
      />
      {error ? <p className="mt-0.5 text-[10px] font-semibold text-clay">{error}</p> : null}
    </div>
  );
}
