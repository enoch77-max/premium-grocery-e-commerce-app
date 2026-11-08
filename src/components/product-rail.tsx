"use client";

import { useCallback, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export function ProductRail({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(true);

  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollBack(track.scrollLeft > 8);
    setCanScrollForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 8);
  }, []);

  const nudge = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(280, track.clientWidth * 0.8), behavior: "smooth" });
    window.setTimeout(sync, 420);
  };

  return (
    <div className="group/rail relative">
      <div
        ref={trackRef}
        onScroll={sync}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {products.map((product) => (
          <div key={product.id} className="w-[164px] shrink-0 snap-start sm:w-[188px] lg:w-[196px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {canScrollBack ? (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll products left"
          className="press absolute -left-3 top-[38%] hidden h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink opacity-0 shadow-lift transition hover:border-brand hover:text-brand focus-visible:opacity-100 group-hover/rail:opacity-100 sm:grid"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      ) : null}
      {canScrollForward ? (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll products right"
          className="press absolute -right-3 top-[38%] hidden h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink opacity-0 shadow-lift transition hover:border-brand hover:text-brand focus-visible:opacity-100 group-hover/rail:opacity-100 sm:grid"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function ProductRailSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="w-[164px] shrink-0 sm:w-[188px] lg:w-[196px]">
          <div className="shimmer aspect-[3/4] w-full rounded-[20px]" />
        </div>
      ))}
    </div>
  );
}
