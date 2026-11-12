"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session-provider";

export type RecurringItem = {
  id: number;
  listId: number;
  productId: number;
  quantity: number;
  priceAtCreationCents: number;
  name?: string | null;
  unit?: string | null;
  imageUrl?: string | null;
  priceCents?: number | null;
};

export type RecurringRun = {
  id: number;
  listId: number;
  occurrenceKey: string;
  scheduledFor: string;
  state: string;
  amountCents: number;
  orderNumber: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  attemptCount: number;
  nextAttemptAt: string | null;
  priceChanged: boolean;
};

export type RecurringList = {
  id: number;
  name: string;
  status: "active" | "paused" | "cancelled";
  cadence: "daily" | "weekly" | "monthly";
  localTime: string;
  timezone: string;
  shortagePolicy: "skip_item" | "partial" | "hold";
  paymentMethodId: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  skipNextAt: string | null;
  delayUntil: string | null;
  pausedReason: string | null;
  completedRuns: number;
  skipCount: number;
  consentAt: string;
  addressLine1: string;
};

export type GatewayStatus = {
  gateway: string;
  supportsOffSessionTokenCharges: boolean;
  configured: boolean;
};

type Payload = {
  lists: RecurringList[];
  items: RecurringItem[];
  runs: RecurringRun[];
  gateway: GatewayStatus;
};

/**
 * One hook for all recurring data. The API returns lists + items + runs together
 * so the timeline renders in a single round-trip (fewer taps, no spinner chains).
 * Every mutation refreshes from the server rather than patching local guesses.
 */
export function useRecurring() {
  const { authFetch, user, loading: sessionLoading } = useSession();
  const [data, setData] = useState<Payload>({
    lists: [],
    items: [],
    runs: [],
    gateway: { gateway: "unconfigured", supportsOffSessionTokenCharges: false, configured: false },
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const response = await authFetch("/api/recurring/lists");
      if (!response.ok) throw new Error("load failed");
      const payload = (await response.json()) as Partial<Payload>;
      setData({
        lists: payload.lists ?? [],
        items: payload.items ?? [],
        runs: payload.runs ?? [],
        gateway: payload.gateway ?? {
          gateway: "unconfigured",
          supportsOffSessionTokenCharges: false,
          configured: false,
        },
      });
    } catch {
      // Keep whatever we already had; the UI shows a gentle retry affordance.
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const itemsFor = useCallback(
    (listId: number) => data.items.filter((item) => item.listId === listId),
    [data.items],
  );

  const runsFor = useCallback(
    (listId: number) =>
      data.runs
        .filter((run) => run.listId === listId)
        .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor)),
    [data.runs],
  );

  /**
   * Timeline = real runs plus a synthetic "scheduled" row for each active list's
   * next occurrence. Without the synthetic row a brand-new list would show an
   * empty timeline even though a delivery is booked.
   */
  const timeline = useMemo(() => {
    const real = data.runs.filter((run) => run.state !== "cancelled");
    const synthetic = data.lists
      .filter((list) => list.status === "active" && list.nextRunAt)
      .filter((list) => !real.some((run) => run.listId === list.id && run.state === "scheduled"))
      .map<RecurringRun>((list) => ({
        id: -list.id,
        listId: list.id,
        occurrenceKey: `next:${list.id}`,
        scheduledFor: list.nextRunAt as string,
        state: "scheduled",
        amountCents: 0,
        orderNumber: null,
        failureCode: null,
        failureMessage: null,
        attemptCount: 0,
        nextAttemptAt: null,
        priceChanged: false,
      }));
    return [...real, ...synthetic]
      .sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor))
      .slice(0, 12);
  }, [data.lists, data.runs]);

  const heldRun = useMemo(() => data.runs.find((run) => run.state === "held") ?? null, [data.runs]);

  const mutate = useCallback(
    async (
      key: string,
      path: string,
      init: RequestInit,
    ): Promise<{ ok: boolean; error?: string; body?: unknown }> => {
      setBusy(key);
      try {
        const response = await authFetch(path, {
          ...init,
          headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
        });
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) return { ok: false, error: body?.error };
        await load();
        return { ok: true, body };
      } catch {
        return { ok: false };
      } finally {
        setBusy(null);
      }
    },
    [authFetch, load],
  );

  const actions = useMemo(
    () => ({
      pause: (id: number) =>
        mutate(`pause:${id}`, `/api/recurring/lists/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "pause", reason: "customer paused" }),
        }),
      resume: (id: number) =>
        mutate(`resume:${id}`, `/api/recurring/lists/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "resume" }),
        }),
      cancel: (id: number) =>
        mutate(`cancel:${id}`, `/api/recurring/lists/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "cancel" }),
        }),
      skip: (id: number) => mutate(`skip:${id}`, `/api/recurring/lists/${id}/skip`, { method: "POST" }),
      delay: (id: number, until: Date) =>
        mutate(`delay:${id}`, `/api/recurring/lists/${id}/delay`, {
          method: "POST",
          body: JSON.stringify({ until: until.toISOString() }),
        }),
      update: (id: number, patch: Record<string, unknown>) =>
        mutate(`update:${id}`, `/api/recurring/lists/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "update", ...patch }),
        }),
      resolve: (listId: number, runId: number, action: "continue_partial" | "wait" | "cancel") =>
        mutate(`resolve:${runId}`, `/api/recurring/lists/${listId}/runs/${runId}/resolve`, {
          method: "POST",
          body: JSON.stringify({ action }),
        }),
    }),
    [mutate],
  );

  return {
    data,
    loading: loading || sessionLoading,
    busy,
    reload: load,
    itemsFor,
    runsFor,
    timeline,
    heldRun,
    actions,
  };
}
