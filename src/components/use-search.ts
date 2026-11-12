"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, Product, SearchResponse } from "@/lib/types";

export const RECENT_KEY = "fresco:recent-searches";

export type SearchSuggestion = {
  type: string;
  label: string;
  href: string;
  emoji?: string;
  meta?: string;
};

/**
 * One search engine for every surface: the desktop header dropdown and the phone
 * full-screen sheet share debounce, caching, recents and result shaping so the
 * behaviour is identical wherever you type.
 */
export function useSearch(active: boolean) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const loadedRecents = useRef(false);

  useEffect(() => {
    if (!active || loadedRecents.current) return;
    loadedRecents.current = true;
    try {
      const stored = window.localStorage.getItem(RECENT_KEY);
      if (stored) setRecents(JSON.parse(stored) as string[]);
    } catch {
      // storage blocked — recents simply stay empty
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          const result = (await response.json()) as SearchResponse;
          setData(result);
        } catch {
          // aborted or offline: keep the previous result set
        } finally {
          setLoading(false);
        }
      },
      query ? 160 : 0,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, active]);

  const remember = useCallback((term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    setRecents((prev) => {
      const next = [cleaned, ...prev.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(
        0,
        6,
      );
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  }, []);

  const products: Product[] = data?.products.slice(0, 6) ?? [];
  const suggestions: SearchSuggestion[] = (data?.suggestions ?? []) as SearchSuggestion[];

  return { query, setQuery, data, loading, recents, remember, clearRecents, products, suggestions };
}

/** Bold the matched part of a label without dangerouslySetInnerHTML. */
export function highlight(text: string, term: string) {
  const t = term.trim();
  if (!t) return [{ text, hit: false }];
  const index = text.toLowerCase().indexOf(t.toLowerCase());
  if (index < 0) return [{ text, hit: false }];
  return [
    { text: text.slice(0, index), hit: false },
    { text: text.slice(index, index + t.length), hit: true },
    { text: text.slice(index + t.length), hit: false },
  ].filter((part) => part.text.length > 0);
}

export type { Category };
