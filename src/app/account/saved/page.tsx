"use client";

import Link from "next/link";
import { AccountGate, AccountShell } from "@/components/account-shell";
import { useSaved } from "@/components/saved-provider";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/components/cart-provider";
import { useSession } from "@/components/session-provider";
import { formatMoney } from "@/lib/format";
import { ArrowRightIcon, HeartIcon } from "@/components/icons";

export default function SavedPage() {
  return (
    <AccountGate>
      <AccountShell>
        <SavedList />
      </AccountShell>
    </AccountGate>
  );
}

function SavedList() {
  const { items: saved, loading, toggle } = useSaved();
  const { addMany } = useCart();
  const { user } = useSession();

  const available = saved.filter((item) => item.product);
  const total = available.reduce((sum, item) => sum + (item.product?.priceCents ?? 0), 0);
  const pending = available.some((item) => item.product);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-white px-4 py-3">
        <div>
          <h2 className="font-display text-[20px] font-semibold tracking-tight">Saved for later</h2>
          <p className="text-[11px] text-ink-soft">
            {loading
              ? "Loading…"
              : `${saved.length} saved item${saved.length === 1 ? "" : "s"} · ${formatMoney(total)} if you add them all`}
          </p>
        </div>
        <button
          type="button"
          disabled={!available.length}
          onClick={() =>
            addMany(
              available
                .map((item) => (item.product ? { productId: item.product.id, quantity: 1 } : null))
                .filter((item): item is { productId: number; quantity: number } => Boolean(item)),
              `${available.length} saved items added`,
            )
          }
          className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[11.5px] font-bold text-white hover:bg-brand-deep disabled:opacity-50"
        >
          Add all to basket <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="shimmer aspect-[3/4] rounded-[20px]" />
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-2xl">
            <HeartIcon className="h-6 w-6 text-clay" />
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold">No saved items yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-soft">
            Tap the heart on any product to keep it here — great for next week&apos;s shop or a price
            you&apos;re watching.
          </p>
          <Link
            href="/"
            className="press mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[12px] font-bold text-white hover:bg-brand-deep"
          >
            Browse the shop <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {available.map(({ product }) =>
              product ? <ProductCard key={product.id} product={product} /> : null,
            )}
          </div>
          {saved.some((item) => !item.product) ? (
            <div className="rounded-2xl border border-line/80 bg-white p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
                No longer stocked
              </p>
              <div className="mt-1.5 space-y-1">
                {saved
                  .filter((item) => !item.product)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="truncate text-ink-soft">{item.slug.replace(/-/g, " ")}</span>
                      <button
                        type="button"
                        onClick={() => void toggle(item.slug)}
                        className="press shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-ink-soft hover:border-clay hover:text-clay"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
          <p className="text-[10.5px] text-ink-soft">
            Saved items follow your account ({user?.email}) — they&apos;ll be here on any device.
            {pending ? "" : ""}
          </p>
        </>
      )}
      <p className="text-[10.5px] text-ink-soft">
        Saved items are stored on your account, not in your basket. Prices reflect today&apos;s store.
      </p>
    </>
  );
}
