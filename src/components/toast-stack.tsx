"use client";

import { useCart } from "@/components/cart-provider";
import { ArrowRightIcon, CheckIcon, CloseIcon } from "@/components/icons";

export function ToastStack() {
  const { toast, dismissToast, openCart } = useCart();
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--tabbar-h)+var(--safe-b)+8px)] z-[95] flex justify-center lg:inset-x-auto lg:right-6 lg:bottom-6 lg:justify-end"
    >
      <div
        key={toast.id}
        className="animate-fade-up pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-lift sm:w-auto sm:min-w-[320px]"
      >
        {toast.imageUrl ? (
          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toast.imageUrl} alt="" className="h-full w-full object-cover" />
          </span>
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <CheckIcon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand">
            <CheckIcon className="h-3 w-3" /> Added to basket
          </p>
          <p className="truncate text-[13px] font-semibold text-ink">{toast.name}</p>
          {toast.unit ? <p className="truncate text-[11px] text-ink-soft">{toast.unit}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => {
            dismissToast();
            openCart();
          }}
          className="press inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-2 text-[11px] font-bold text-cream hover:bg-brand-deep"
        >
          View basket <ArrowRightIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={dismissToast}
          className="press grid h-7 w-7 place-items-center rounded-full text-ink-soft hover:bg-cream-deep"
          aria-label="Dismiss"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
