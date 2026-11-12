"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import type { OrderItemRecord, OrderRecord } from "@/lib/order-types";

export type AccountOrder = Omit<OrderRecord, "createdAt" | "cancelledAt"> & {
  createdAt: string;
  cancelledAt: string | null;
  items: OrderItemRecord[];
};

export type AccountAddress = {
  id: number;
  userId: number;
  label: string;
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  phone: string;
  instructions: string;
  isDefault: boolean;
  createdAt: string;
};

export function useAccountOrders() {
  const { authFetch, user } = useSession();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await authFetch("/api/account/orders");
      const data = (await response.json().catch(() => null)) as { orders?: AccountOrder[] } | null;
      setOrders(data?.orders ?? []);
      setError(null);
    } catch {
      setError("We couldn't load your orders. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { orders, loading, error, reload: load };
}

export function useAccountAddresses() {
  const { authFetch, user } = useSession();
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await authFetch("/api/account/addresses");
      const data = (await response.json().catch(() => null)) as { addresses?: AccountAddress[] } | null;
      setAddresses(data?.addresses ?? []);
    } catch {
      setError("We couldn't load your addresses.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { addresses, setAddresses, loading, error, reload: load };
}

export function orderTotals(
  order:
    | AccountOrder
    | {
        subtotalCents: number;
        discountCents: number;
        deliveryCents: number;
        totalCents: number;
        savingsCents: number;
      },
) {
  return {
    subtotal: order.subtotalCents,
    discount: order.discountCents,
    delivery: order.deliveryCents,
    total: order.totalCents,
    savings: order.savingsCents,
  };
}
