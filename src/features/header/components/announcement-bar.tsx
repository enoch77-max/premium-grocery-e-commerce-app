import Link from "next/link";
import { ArrowRightIcon, BoltIcon, LeafIcon, TruckIcon } from "@/components/icons";

type Props = { announcement: string; storeOpen: boolean };

/** Top strip: owner announcement, trust marks, paused-store banner. */
export function AnnouncementBar({ announcement, storeOpen }: Props) {
  return (
    <>
    <div className="hide-in-landscape bg-brand-deep text-cream">
      <div className="mx-auto flex max-w-[1340px] 2xl:max-w-[1600px] items-center justify-between gap-3 px-3 py-2 text-[11px] font-medium sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <BoltIcon className="h-3.5 w-3.5 shrink-0 text-lime" />
          <span className="truncate font-semibold">{announcement}</span>
          <span className="hidden text-cream/50 sm:inline">·</span>
          <span className="hidden text-cream/80 sm:inline">30-minute slots, 7 days a week</span>
        </div>
        <div className="hidden items-center gap-5 text-cream/75 lg:flex">
          <span className="inline-flex items-center gap-1.5">
            <LeafIcon className="h-3.5 w-3.5" /> Farm-fresh guarantee
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TruckIcon className="h-3.5 w-3.5" /> Contactless delivery
          </span>
        </div>
        <Link
          href="/offers"
          className="group inline-flex shrink-0 items-center gap-1.5 font-semibold text-cream hover:text-lime"
        >
          Today&apos;s offers
          <ArrowRightIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
      {!storeOpen ? (
    <div className="bg-rose-soft px-4 py-2 text-center text-[11.5px] font-bold text-clay">
      We are paused for a short restock — ordering reopens very soon.
    </div>
      ) : null}
    </>
  );
}
