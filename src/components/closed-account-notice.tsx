"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

/** Confirms the account closure after /api/account/delete redirects home. */
export function ClosedAccountNotice() {
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || params.get("closed") !== "1") return null;

  return (
    <div className="mx-auto mt-3 max-w-[1340px] px-4 sm:px-6">
      <div className="flex items-start gap-3 rounded-2xl border border-brand/25 bg-brand-soft/50 px-4 py-3">
        <span className="mt-0.5 text-lg" aria-hidden>
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-brand-deep">Your account is closed</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
            Your profile, addresses and saved items have been deleted. Order records stay anonymised for accounting. You
            can create a new account any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="press -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-white"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
