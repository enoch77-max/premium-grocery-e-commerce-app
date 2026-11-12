"use client";

import type { Product } from "@/lib/types";
import { highlightIcon, productSignals, productSpecs, type Signal, type SignalIconId } from "@/lib/signals";
import {
  CheckIcon,
  DewIcon,
  FishIcon,
  HeartLeafIcon,
  JarIcon,
  LeafIcon,
  MilkDropIcon,
  ScaleIcon,
  ShieldIcon,
  SnowIcon,
  SparkleIcon,
  SproutIcon,
  StarIcon,
  SunRiseIcon,
  WheatIcon,
} from "@/components/icons";

export function SignalIcon({
  id,
  className,
  strokeWidth,
  style,
}: {
  id: SignalIconId;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const extra = { className, strokeWidth, style };
  switch (id) {
    case "sprout":
      return <SproutIcon {...extra} />;
    case "leaf":
      return <LeafIcon {...extra} />;
    case "heartleaf":
      return <HeartLeafIcon {...extra} />;
    case "wheat":
      return <WheatIcon {...extra} />;
    case "fish":
      return <FishIcon {...extra} />;
    case "jar":
      return <JarIcon {...extra} />;
    case "milk":
      return <MilkDropIcon {...extra} />;
    case "dew":
      return <DewIcon {...extra} />;
    case "sparkle":
      return <SparkleIcon {...extra} />;
    case "star":
      return <StarIcon {...extra} />;
    case "shield":
      return <ShieldIcon {...extra} />;
    case "sunrise":
      return <SunRiseIcon {...extra} />;
    case "snow":
      return <SnowIcon {...extra} />;
    case "scale":
      return <ScaleIcon {...extra} />;
    default:
      return <LeafIcon {...extra} />;
  }
}

const TONE_TEXT: Record<Signal["tone"], string> = {
  green: "text-brand",
  amber: "text-[#a9750c]",
  rose: "text-clay",
  sky: "text-[#2b5580]",
  ink: "text-ink",
};

/**
 * The single on-photo signal.
 *
 * Design rule: one fact per photo. Earlier versions stacked a discount badge, a
 * rotating seal, two chips and a stock pill on top of each other — the photo
 * became a poster and the product was hidden. A card now shows the product, a
 * small discount tag and at most one quiet icon+word chip.
 */
export function SignalChip({ signal }: { signal: Signal }) {
  return (
    <span className="pointer-events-none inline-flex max-w-full items-center gap-1 rounded-full bg-white/92 px-1.5 py-[3px] shadow-[0_1px_3px_rgba(19,38,29,0.14)] backdrop-blur">
      <SignalIcon
        id={signal.icon}
        className={`h-3 w-3 shrink-0 ${TONE_TEXT[signal.tone]}`}
        strokeWidth={2.1}
      />
      <span className="truncate text-[9px] font-semibold leading-none text-ink">{signal.label}</span>
    </span>
  );
}

/** Discount tag + optional single signal, anchored to opposite corners. */
export function SignalStack({ product, leading }: { product: Product; leading?: React.ReactNode }) {
  const signal = productSignals(product)[0];
  if (!signal && !leading) return null;
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col items-start gap-1">{leading}</div>
      {signal ? <SignalChip signal={signal} /> : null}
    </div>
  );
}

/**
 * One compact fact bar: four icon + label + value cells inside a single tile.
 * Replaces four oversized cards that carried the same information.
 */
export function SpecStrip({ product }: { product: Product }) {
  const specs = productSpecs(product);
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-line/60 overflow-hidden rounded-xl border border-line/70 bg-white sm:grid-cols-4 sm:divide-y-0">
      {specs.map((spec) => (
        <div key={spec.id} className="flex items-center gap-1.5 px-2 py-1.5">
          <SignalIcon id={spec.icon} className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={1.9} />
          <span className="min-w-0 leading-tight">
            <span className="block text-[8px] font-bold uppercase tracking-[0.08em] text-ink-soft">
              {spec.label}
            </span>
            <span className="block truncate text-[10.5px] font-semibold text-ink">{spec.value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Highlights as one tile with three compact rows. Three large cards for three
 * short phrases was the main source of vertical bloat on the product page.
 */
export function HighlightTiles({ product }: { product: Product }) {
  const items = product.highlights.slice(0, 3);
  if (!items.length) return null;
  return (
    <ul className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line/70 bg-white">
      {items.map((highlight) => (
        <li key={highlight} className="flex items-center gap-2 px-2.5 py-1.5">
          <SignalIcon
            id={highlightIcon(highlight)}
            className="h-3.5 w-3.5 shrink-0 text-brand"
            strokeWidth={2}
          />
          <span className="min-w-0 truncate text-[11.5px] font-medium text-ink">{highlight}</span>
        </li>
      ))}
    </ul>
  );
}

/** Tiny verification row used under the buy button — icons, not sentences. */
export function TrustRow() {
  return (
    <div className="flex items-center justify-center gap-3 text-[9.5px] font-bold text-ink-soft">
      <span className="inline-flex items-center gap-1">
        <ShieldIcon className="h-3 w-3 text-brand" /> Freshness promise
      </span>
      <span className="inline-flex items-center gap-1">
        <CheckIcon className="h-3 w-3 text-brand" /> Secure checkout
      </span>
      <span className="inline-flex items-center gap-1">
        <DewIcon className="h-3 w-3 text-brand" /> Cold chain
      </span>
    </div>
  );
}
