"use client";

import { useEffect, useState } from "react";

export function ActiveSessions({
  authFetch,
}: {
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
}) {
  const [sessions, setSessions] = useState<
    { id: number; device: string; createdAt: string; current: boolean }[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await authFetch("/api/account/sessions");
      const data = (await response.json().catch(() => null)) as {
        sessions?: { id: number; device: string; createdAt: string; current: boolean }[];
      } | null;
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
          <li
            key={session.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-cream/60 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-ink">
                {session.device}
                {session.current ? (
                  <span className="ml-1.5 rounded-full bg-brand-soft px-1.5 text-[9px] font-extrabold uppercase text-brand-deep">
                    This device
                  </span>
                ) : null}
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
            const data = (await response.json().catch(() => null)) as {
              message?: string;
              error?: string;
            } | null;
            setMessage(
              response.ok
                ? (data?.message ?? "Other devices signed out")
                : (data?.error ?? "Could not sign out"),
            );
            if (response.ok) {
              const refreshed = await authFetch("/api/account/sessions");
              const next = (await refreshed.json().catch(() => null)) as {
                sessions?: typeof sessions;
              } | null;
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
