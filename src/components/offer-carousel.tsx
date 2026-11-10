"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Offer } from "@/lib/types";
import { theme } from "@/components/themes";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export function OfferHero({ offers }: { offers: Offer[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = offers.slice(0, 3);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % slides.length), 6500);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (!slides.length) return null;
  const active = slides[index];
  const style = theme(active.theme);

  return (
    <section
      className={`relative overflow-hidden rounded-[26px] ${style.panel} shadow-[0_24px_60px_-40px_rgba(19,38,29,0.9)]`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Featured offers"
    >
      <div className="relative flex min-h-[236px] flex-col justify-between p-4 sm:min-h-[330px] sm:p-7">
        <div
          className={`pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-gradient-to-br ${style.glow} blur-2xl`}
        />
        {active.imageUrl ? (
          <div className="pointer-events-none absolute -bottom-8 -right-6 h-[150px] w-[150px] overflow-hidden rounded-full border-[6px] border-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] sm:h-[250px] sm:w-[250px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}

        <div className="relative z-[15] w-full">
          <span
            className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.09em] sm:text-[10px] sm:tracking-[0.12em] ${style.badge}`}
          >
            <span className="text-[12px]">{active.emoji}</span> {active.eyebrow}
          </span>
          <div className="max-w-[66%] sm:max-w-[58%]">
            <h2 className="mt-2.5 font-display text-[24px] font-semibold leading-[1.05] tracking-[-0.02em] sm:mt-3 sm:text-[40px] sm:leading-[1.03]">
              {active.title}
            </h2>
            <p className="mt-2 hidden max-w-[300px] text-[12.5px] leading-relaxed opacity-85 sm:block">
              {active.subtitle}
            </p>
          </div>
          <span
            className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-2xl px-4 py-2.5 text-center text-[11.5px] font-bold leading-snug text-balance shadow-sm sm:mt-4 sm:rounded-full sm:text-[12px] ${style.cta}`}
          >
            {active.ctaLabel}
            <ArrowRightIcon className="h-3.5 w-3.5 shrink-0" />
          </span>
        </div>

        <div className="relative z-[20] mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {slides.map((offer, slideIndex) => (
              <button
                key={offer.slug}
                type="button"
                onClick={() => setIndex(slideIndex)}
                aria-label={`Show offer ${slideIndex + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  slideIndex === index ? "w-7 bg-current opacity-90" : "w-1.5 bg-current opacity-35 hover:opacity-60"
                }`}
              />
            ))}
          </div>
          <span className="ml-auto hidden min-w-0 truncate rounded-lg border border-current/20 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] opacity-70 sm:block">
            {active.badge}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous offer"
              onClick={() => setIndex((value) => (value - 1 + slides.length) % slides.length)}
              className="press grid h-7 w-7 place-items-center rounded-full border border-current/20 bg-white/10 hover:bg-white/25"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next offer"
              onClick={() => setIndex((value) => (value + 1) % slides.length)}
              className="press grid h-7 w-7 place-items-center rounded-full border border-current/20 bg-white/10 hover:bg-white/25"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <Link
          href={active.href}
          className="absolute inset-0 z-10 rounded-[26px]"
          aria-label={`${active.title} — ${active.ctaLabel}`}
        />
      </div>
    </section>
  );
}

export function MiniOfferCard({ offer }: { offer: Offer }) {
  const style = theme(offer.theme);
  return (
    <Link
      href={offer.href}
      className={`press group relative flex flex-1 items-center overflow-hidden rounded-[22px] ${style.panel} p-4 shadow-[0_16px_40px_-32px_rgba(19,38,29,0.8)] hover:shadow-lift`}
    >
      <div className="relative z-10 max-w-[68%]">
        <span
          className={`inline-block max-w-full whitespace-nowrap text-[9px] font-extrabold uppercase tracking-[0.1em] sm:text-[9.5px] sm:tracking-[0.13em] ${style.eyebrow}`}
        >
          {offer.badge}
        </span>
        <h3 className="mt-1 font-display text-[19px] font-semibold leading-[1.08]">{offer.title}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug opacity-80">{offer.subtitle}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold">
          {offer.ctaLabel}
          <ArrowRightIcon className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </span>
      </div>
      {offer.imageUrl ? (
        <div className="absolute -bottom-6 -right-6 h-[112px] w-[112px] overflow-hidden rounded-full border-4 border-white/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={offer.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <span className="absolute -right-1 bottom-1 text-[64px] opacity-25">{offer.emoji}</span>
      )}
    </Link>
  );
}
