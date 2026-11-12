"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { highlight, useSearch, type Category } from "@/components/use-search";
import { ArrowRightIcon, CloseIcon, SearchIcon } from "@/components/icons";
import { SearchResults } from "@/components/search-results";

/**
 * The search experience itself: a live input plus an anchored results panel.
 * `variant="inline"` renders a dropdown under the desktop header field;
 * `variant="sheet"` fills the phone full-screen sheet. Same engine, same
 * keyboard model, same result rows — so learning it once works everywhere.
 */
export function SearchBox({
  categories,
  variant,
  onDone,
  autoFocus = false,
}: {
  categories: Category[];
  variant: "inline" | "sheet";
  onDone: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const { add, isPending } = useCart();
  const { query, setQuery, data, loading, recents, remember, clearRecents, products, suggestions } =
    useSearch(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(-1);
  const [open, setOpen] = useState(variant === "sheet");
  const pathname = usePathname();

  // Navigating (from a result, a chip or the see-all bar) always closes the panel.
  useEffect(() => {
    setOpen(variant === "sheet");
    setCursor(-1);
  }, [pathname, variant]);

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const optionTotal = products.length + suggestions.length;

  const goProduct = (slug: string) => {
    remember(query);
    onDone();
    router.push(`/product/${slug}`);
  };
  const goHref = (href: string) => {
    onDone();
    router.push(href);
  };
  const goAll = () => {
    remember(query);
    onDone();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (variant === "inline" && !open) onDone();
      else setOpen(false), onDone();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setCursor((prev) => (optionTotal ? (prev + 1) % optionTotal : -1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((prev) => (optionTotal ? (prev - 1 + optionTotal) % optionTotal : -1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (cursor >= 0 && cursor < products.length) {
        goProduct(products[cursor].slug);
        return;
      }
      if (cursor >= products.length && cursor < optionTotal) {
        goHref(suggestions[cursor - products.length].href);
        return;
      }
      if (query.trim()) goAll();
    }
  };

  const results = (
    <SearchResults
      query={query}
      data={data}
      loading={loading}
      products={products}
      suggestions={suggestions}
      cursor={cursor}
      categories={categories}
      variant={variant}
      setQuery={setQuery}
      recents={recents}
      clearRecents={clearRecents}
      goProduct={goProduct}
      goHref={goHref}
      onDone={onDone}
    />
  );
  const inputRow = (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${variant === "sheet" ? "px-3 py-2.5" : ""}`}>
      <SearchIcon className="h-4.5 w-4.5 shrink-0 text-brand" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCursor(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={
          variant === "sheet" ? "Search milk, avocados, sourdough…" : "Search groceries — try “vegan snacks”"
        }
        className="h-10 min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-soft/70 sm:text-[13.5px]"
        aria-label="Search groceries"
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-controls="fresco-search-results"
        id={variant === "inline" ? "fresco-search-input" : undefined}
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="press tap-xl grid shrink-0 place-items-center rounded-full text-ink-soft hover:bg-cream-deep"
          aria-label="Clear search"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      ) : variant === "inline" ? (
        <span className="hidden shrink-0 items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-ink- lg:inline-flex">
          ⌘K
        </span>
      ) : null}
      {variant === "sheet" ? (
        <button
          type="button"
          onClick={onDone}
          className="-mr-1 flex h-10 shrink-0 items-center rounded-xl px-2.5 text-[14px] font-bold text-brand"
        >
          Cancel
        </button>
      ) : null}
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
        <div className="shrink-0 border-b border-line/80">{inputRow}</div>
        <div
          id="fresco-search-results"
          className="sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {results}
        </div>
        {query && products.length ? (
          <div className="safe-b shrink-0 border-t border-line/80 bg-white/95 px-3 py-2.5 backdrop-blur">
            <button
              type="button"
              onClick={goAll}
              className="press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-bold text-cream hover:bg-brand-deep"
            >
              See all {data?.total ?? products.length} result
              {(data?.total ?? products.length) === 1 ? "" : "s"} <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      {/* the field itself: focus anywhere on it and results anchor underneath */}
      <div
        className={`flex h-11 w-full cursor-text items-center rounded-full border bg-white px-4 shadow-[0_1px_0_rgba(19,38,29,0.03)] transition ${
          open ? "border-brand/50 shadow-soft" : "border-line hover:border-brand/50"
        }`}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {inputRow}
      </div>
      {open ? (
        <div
          id="fresco-search-results"
          className="animate-scale-in absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(60vh,520px)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white shadow-lift"
        >
          {results}
          {query && products.length ? (
            <div className="sticky bottom-0 border-t border-line/80 bg-white/95 px-3 py-2 backdrop-blur">
              <button
                type="button"
                onClick={goAll}
                className="press flex h-9 w-full items-center justify-center gap-2 rounded-full bg-ink text-[12px] font-bold text-cream hover:bg-brand-deep"
              >
                See all {data?.total ?? products.length} result
                {(data?.total ?? products.length) === 1 ? "" : "s"} <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
