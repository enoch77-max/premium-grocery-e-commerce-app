"use client";

import { useEffect } from "react";
import type { Category } from "@/lib/types";
import { SearchBox } from "@/components/search-box";

/**
 * Phone search: a full-screen sheet with the live SearchBox inside. Desktop uses
 * the same engine as an anchored dropdown in the header, so results, recents and
 * keyboard behaviour never diverge between the two.
 */
export function SearchOverlay({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-center sm:px-6 sm:pt-[8vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search groceries"
    >
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[3px] max-sm:hidden"
        onClick={onClose}
      />
      <div className="animate-scale-in relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white max-sm:rounded-none sm:max-h-[80vh] sm:max-w-3xl sm:rounded-[26px] sm:border sm:border-line sm:shadow-[0_40px_120px_-30px_rgba(19,38,29,0.5)]">
        <SearchBox categories={categories} variant="sheet" onDone={onClose} autoFocus />
      </div>
    </div>
  );
}
