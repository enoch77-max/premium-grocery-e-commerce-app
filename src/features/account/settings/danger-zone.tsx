"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "./settings-field";

export function DangerZone({
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
        Permanently removes your profile, addresses and saved items. Order records are kept anonymised for
        accounting.
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
          <Field label="Type DELETE to confirm" value={confirm} onChange={setConfirm} />
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
                  const data = (await response.json().catch(() => null)) as {
                    ok?: boolean;
                    error?: string;
                  } | null;
                  if (!response.ok || !data?.ok)
                    throw new Error(data?.error ?? "Could not close the account");
                  router.replace("/?closed=1");
                  router.refresh();
                } catch (deleteError) {
                  setError(
                    deleteError instanceof Error ? deleteError.message : "Could not close the account",
                  );
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
