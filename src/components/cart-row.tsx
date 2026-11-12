"use client";

import Image from "next/image";
import Link from "next/link";
import type { CartLine } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/icons";

export function CartRow({
  line,
  pending,
  onIncrease,
  onDecrease,
  onRemove,
  onClose,
}: {
  line: CartLine;
  pending: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line/70 bg-white p-2.5">
      <div className="flex gap-3">
        <Link
          href={`/product/${line.slug}`}
          onClick={onClose}
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line/60 bg-cream"
        >
<Image
            src={line.imageUrl}
            alt={line.name}
            fill
            sizes="56px"
            className="h-full w-full object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/product/${line.slug}`} onClick={onClose} className="min-w-0">
              <p className="line-clamp-2 text-[12.5px] font-bold leading-snug text-ink">{line.name}</p>
              <p className="mt-0.5 text-[10.5px] text-ink-soft">{line.unit}</p>
            </Link>
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="press -mr-2 -mt-2 grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-cream-deep hover:text-clay disabled:opacity-50 sm:-mr-1 sm:-mt-1 sm:h-6 sm:w-6"
              aria-label={`Remove ${line.name}`}
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center rounded-full border border-line bg-cream/60">
              <button
                type="button"
                onClick={onDecrease}
                disabled={pending}
                className="press grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-cream-deep disabled:opacity-50 sm:h-7 sm:w-7"
                aria-label="Decrease quantity"
              >
                <MinusIcon className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-[13px] font-bold tabular-nums sm:w-5 sm:text-[12px]">
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={onIncrease}
                disabled={pending || line.quantity >= Math.max(1, Math.min(20, line.stock))}
                title={line.quantity >= line.stock ? `Only ${line.stock} available today` : undefined}
                className="press grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-cream-deep disabled:opacity-50 sm:h-7 sm:w-7"
                aria-label="Increase quantity"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-ink">{formatMoney(line.lineTotalCents)}</p>
              {line.compareAtCents ? (
                <p className="text-[10px] font-medium text-ink-soft line-through">
                  {formatMoney(line.compareAtCents * line.quantity)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
