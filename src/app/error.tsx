"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRightIcon, RefreshIcon } from "@/components/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the failure without breaking the shopper's session.
    console.error("Route error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-soft text-3xl">🧺</div>
      <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-clay">
        Something went wrong
      </p>
      <h1 className="mt-1.5 font-display text-[30px] font-semibold leading-tight tracking-tight">
        We dropped a bag.
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-soft">
        This page failed to load, but your basket is safe. Try again — if it keeps happening, our team is one
        message away.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="press inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-[13px] font-bold text-white hover:bg-brand-deep"
        >
          <RefreshIcon className="h-4 w-4" /> Try again
        </button>
        <Link
          href="/"
          className="press inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-[13px] font-bold text-ink hover:border-brand hover:text-brand"
        >
          Back to the shop <ArrowRightIcon className="h-4 w-4" />
        </Link>
        <Link
          href="/info/contact"
          className="press inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-[13px] font-bold text-ink hover:border-brand hover:text-brand"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}
