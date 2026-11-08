import Link from "next/link";
import { ArrowRightIcon, SearchIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl">🥬</div>
      <p className="mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-brand">404 · Out of stock</p>
      <h1 className="mt-1.5 font-display text-[32px] font-semibold leading-tight tracking-tight">
        This aisle has moved.
      </h1>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-soft">
        The page you were looking for isn&apos;t on our shelves. Head back to the storefront or search for what you need —
        fresh stock lands every morning.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="press inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-[13px] font-bold text-white hover:bg-brand-deep"
        >
          Back to the shop <ArrowRightIcon className="h-4 w-4" />
        </Link>
        <Link
          href="/search?q=organic"
          className="press inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-[13px] font-bold text-ink hover:border-brand hover:text-brand"
        >
          <SearchIcon className="h-4 w-4" /> Search groceries
        </Link>
      </div>
    </div>
  );
}
