"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "@/components/session-provider";
import type { Product } from "@/lib/types";

export type SavedEntry = { id: number; slug: string; product: Product | null };

type SavedContextValue = {
  items: SavedEntry[];
  slugs: string[];
  loading: boolean;
  isSaved: (slug: string) => boolean;
  toggle: (slug: string) => Promise<{ ok: boolean; saved: boolean; requiresAuth?: boolean }>;
  refresh: () => Promise<void>;
};

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user, authFetch } = useSession();
  const [items, setItems] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const response = await authFetch("/api/account/saved");
      const data = (await response.json().catch(() => null)) as { saved?: SavedEntry[] } | null;
      setItems(data?.saved ?? []);
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  const slugs = useMemo(() => items.map((item) => item.slug), [items]);

  const toggle = useCallback(
    async (slug: string) => {
      if (!user) return { ok: false, saved: false, requiresAuth: true };
      const response = await authFetch("/api/account/saved", {
        method: "POST",
        body: JSON.stringify({ slug, action: "toggle" }),
      });
      const data = (await response.json().catch(() => null)) as { saved?: boolean } | null;
      if (data?.saved === undefined) return { ok: false, saved: false };
      // Optimistically update slugs, then refetch the hydrated list.
      setItems((prev) =>
        data.saved
          ? prev.some((item) => item.slug === slug)
            ? prev
            : [
                ...prev,
                { id: Date.now(), slug, product: prev.find((item) => item.slug === slug)?.product ?? null },
              ]
          : prev.filter((item) => item.slug !== slug),
      );
      setVersion((value) => value + 1);
      return { ok: true, saved: data.saved };
    },
    [authFetch, user],
  );

  const isSaved = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const value = useMemo<SavedContextValue>(
    () => ({ items, slugs, loading, isSaved, toggle, refresh }),
    [items, isSaved, loading, refresh, slugs, toggle],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const context = useContext(SavedContext);
  if (!context) throw new Error("useSaved must be used inside SavedProvider");
  return context;
}
