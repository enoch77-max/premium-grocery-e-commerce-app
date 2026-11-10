import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
  actionLabel = "View all",
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  actionLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-4 sm:gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand sm:mb-1 sm:text-[10.5px]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-[21px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-ink-soft">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        {href ? (
          <Link
            href={href}
            className="press group inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[11.5px] font-bold text-ink hover:border-brand hover:text-brand"
          >
            {actionLabel}
            <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
