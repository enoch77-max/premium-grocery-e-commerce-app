"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useSession } from "@/components/session-provider";
import { ArrowRightIcon, CheckIcon, CloseIcon, RefreshIcon, UserIcon } from "@/components/icons";

export function OrderActions({
  orderNumber,
  status,
  editable,
}: {
  orderNumber: string;
  status: string;
  editable: boolean;
}) {
  const { openCart, refresh: refreshCart } = useCart();
  const { user, authFetch, token } = useSession();
  const [busy, setBusy] = useState<"reorder" | "cancel" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [cancelled, setCancelled] = useState(status === "cancelled");

  const reorder = async () => {
    setBusy("reorder");
    setMessage(null);
    try {
      const response = await authFetch(`/api/orders/${orderNumber}/reorder`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; added?: number; unavailable?: string[] }
        | null;
      if (!response.ok) {
        setMessage(data?.error ?? "We couldn't reorder that basket.");
        return;
      }
      setMessage(
        data?.unavailable?.length
          ? `${data.added} items added. Unavailable today: ${data.unavailable.join(", ")}.`
          : `${data?.added ?? 0} items added to your basket.`,
      );
      await refreshCart();
      openCart();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    setMessage(null);
    try {
      const response = await authFetch(`/api/orders/${orderNumber}/cancel`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(data?.error ?? "We couldn't cancel that order.");
        return;
      }
      setCancelled(true);
      setConfirm(false);
      setMessage("Order cancelled — the refund is on its way.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-line/80 bg-white p-3.5">
      {message ? (
        <p className="mb-2 rounded-lg bg-brand-soft/70 px-2.5 py-1.5 text-[11px] font-semibold text-brand-deep">{message}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => void reorder()}
          disabled={busy === "reorder"}
          className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-[11px] font-bold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {busy === "reorder" ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <RefreshIcon className="h-3.5 w-3.5" />
          )}
          Reorder
        </button>
        {editable && !cancelled ? (
          confirm ? (
            <>
              <button
                type="button"
                onClick={() => void cancel()}
                disabled={busy === "cancel"}
                className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-clay px-3 text-[11px] font-bold text-white disabled:opacity-60"
              >
                <CloseIcon className="h-3 w-3" /> Yes, cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="press inline-flex h-8 items-center rounded-full border border-line px-3 text-[11px] font-bold text-ink"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="press inline-flex h-8 items-center rounded-full border border-line px-3 text-[11px] font-bold text-ink-soft hover:border-clay hover:text-clay"
            >
              Cancel order
            </button>
          )
        ) : null}
        {user ? (
          <Link
            href={`/account/orders/${orderNumber}`}
            className="press inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-[11px] font-bold text-ink hover:border-brand hover:text-brand"
          >
            Manage order <ArrowRightIcon className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
      {cancelled ? (
        <p className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-clay">
          <CheckIcon className="h-3 w-3" /> Cancellation confirmed
        </p>
      ) : null}
      {!user && !token ? (
        <p className="mt-2 border-t border-line/70 pt-2 text-[10.5px] leading-relaxed text-ink-soft">
          <Link href={`/login?next=${encodeURIComponent(`/account/orders/${orderNumber}`)}`} className="inline-flex items-center gap-1 font-bold text-brand hover:underline">
            <UserIcon className="h-3 w-3" /> Create an account with this email
          </Link>{" "}
          to keep this order in your history and reorder in one tap.
        </p>
      ) : null}
    </div>
  );
}
