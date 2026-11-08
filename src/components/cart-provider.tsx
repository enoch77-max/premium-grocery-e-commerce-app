"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartState, Product } from "@/lib/types";

type AddableProduct = Pick<Product, "id" | "name" | "imageUrl" | "unit">;

type Toast = {
  id: number;
  name: string;
  imageUrl?: string;
  unit?: string;
  quantity: number;
};

type CartContextValue = {
  cart: CartState | null;
  loading: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (product: AddableProduct, quantity?: number) => Promise<void>;
  addMany: (items: Array<{ productId: number; quantity?: number }>, label?: string) => Promise<void>;
  setQuantity: (productId: number, quantity: number) => Promise<void>;
  remove: (productId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
  pendingIds: number[];
  isPending: (productId: number) => boolean;
  quantityOf: (productId: number) => number;
  toast: Toast | null;
  dismissToast: () => void;
  pulse: number;
  cartToken: string | null;
  restoreCount: number;
  restoreBasket: () => Promise<void>;
  clearBasket: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_TOKEN_KEY = "fresco:cart-token";
const SNAPSHOT_KEY = "fresco:cart-snapshot";

type SnapshotItem = { productId: number; quantity: number };

function readToken() {
  try {
    return window.localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(CART_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function writeSnapshot(lines: SnapshotItem[]) {
  try {
    if (lines.length) window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(lines));
  } catch {
    // ignore
  }
}

function clearSnapshot() {
  try {
    window.localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

function readSnapshot(): SnapshotItem[] {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SnapshotItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => Number.isFinite(item.productId)) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pulse, setPulse] = useState(0);
  const [restoreCount, setRestoreCount] = useState(0);
  const tokenRef = useRef<string | null>(null);
  const [cartToken, setCartToken] = useState<string | null>(null);
  const seqRef = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartHeaders = useCallback((withJson = false): HeadersInit => {
    const headers: Record<string, string> = {};
    if (withJson) headers["Content-Type"] = "application/json";
    if (tokenRef.current) headers["x-cart-token"] = tokenRef.current;
    return headers;
  }, []);

  const acceptCart = useCallback((data: { cart?: CartState; cartToken?: string | null } | null) => {
    if (data?.cartToken) {
      // The server returns the winning token after healing cookie/localStorage
      // drift — always adopt it so both locations stay in sync.
      tokenRef.current = data.cartToken;
      storeToken(data.cartToken);
      setCartToken(data.cartToken);
    }
    if (!data?.cart) return null;
    setCart(data.cart);
    if (data.cart.lines.length) {
      writeSnapshot(data.cart.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })));
      setRestoreCount(0);
    } else {
      setRestoreCount(readSnapshot().length);
    }
    return data.cart;
  }, []);

  const fetchCart = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      tokenRef.current = tokenRef.current ?? readToken();
      const response = await fetch("/api/cart", { cache: "no-store", headers: cartHeaders() });
      const data = (await response.json()) as { cart: CartState; cartToken?: string | null };
      // Drop responses that a newer request has already superseded, otherwise a
      // slow GET can resurrect an old, empty basket over a live one.
      if (seq !== seqRef.current) return;
      acceptCart(data);
    } catch {
      // keep whatever state we have
    } finally {
      setLoading(false);
    }
  }, [acceptCart, cartHeaders]);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  // Browsers restore pages from the back/forward cache with stale React state.
  // Revalidate so the basket shown is always the basket the server has.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === "visible") void fetchCart();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void fetchCart();
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [fetchCart]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const markPending = useCallback((id: number, active: boolean) => {
    setPendingIds((prev) => (active ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
  }, []);

  const showToast = useCallback((next: Omit<Toast, "id">) => {
    setToast({ ...next, id: Date.now() });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3600);
  }, []);

  const mutate = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", body?: unknown, query?: string) => {
      tokenRef.current = tokenRef.current ?? readToken();
      seqRef.current += 1;
      const response = await fetch(`/api/cart${query ?? ""}`, {
        method,
        headers: cartHeaders(true),
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | { cart?: CartState; cartToken?: string | null }
        | null;
      const updated = acceptCart(data);
      if (updated) {
        setPulse((value) => value + 1);
        return updated;
      }
      return null;
    },
    [acceptCart, cartHeaders],
  );

  const add = useCallback(
    async (product: AddableProduct, quantity = 1) => {
      markPending(product.id, true);
      try {
        await mutate("POST", { productId: product.id, quantity });
        showToast({ name: product.name, imageUrl: product.imageUrl, unit: product.unit, quantity });
      } finally {
        markPending(product.id, false);
      }
    },
    [markPending, mutate, showToast],
  );

  const addMany = useCallback(
    async (items: Array<{ productId: number; quantity?: number }>, label?: string) => {
      items.forEach((item) => markPending(item.productId, true));
      try {
        const updated = await mutate("POST", {
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity ?? 1 })),
        });
        if (updated) {
          showToast({
            name: label ?? "Bundle added to basket",
            quantity: items.length,
          });
        }
      } finally {
        items.forEach((item) => markPending(item.productId, false));
      }
    },
    [markPending, mutate, showToast],
  );

  const setQuantity = useCallback(
    async (productId: number, quantity: number) => {
      markPending(productId, true);
      try {
        await mutate("PATCH", { productId, quantity });
      } finally {
        markPending(productId, false);
      }
    },
    [markPending, mutate],
  );

  const remove = useCallback(
    async (productId: number) => {
      markPending(productId, true);
      try {
        await mutate("DELETE", undefined, `?productId=${productId}`);
      } finally {
        markPending(productId, false);
      }
    },
    [markPending, mutate],
  );

  const applyCoupon = useCallback(
    async (code: string) => {
      tokenRef.current = tokenRef.current ?? readToken();
      const response = await fetch("/api/cart/coupon", {
        method: "POST",
        headers: cartHeaders(true),
        body: JSON.stringify({ code }),
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | { cart?: CartState; cartToken?: string | null }
        | null;
      const updated = acceptCart(data);
      if (updated) {
        setPulse((value) => value + 1);
        if (updated.coupon) {
          return { ok: true, message: `${updated.coupon.code} applied — ${updated.coupon.description}` };
        }
        return { ok: false, message: updated.couponError ?? "That code can't be used right now" };
      }
      return { ok: false, message: "Something went wrong. Try again." };
    },
    [acceptCart, cartHeaders],
  );

  const removeCoupon = useCallback(async () => {
    tokenRef.current = tokenRef.current ?? readToken();
    const response = await fetch("/api/cart/coupon", {
      method: "DELETE",
      cache: "no-store",
      headers: cartHeaders(),
    });
    const data = (await response.json().catch(() => null)) as
      | { cart?: CartState; cartToken?: string | null }
      | null;
    acceptCart(data);
    setPulse((value) => value + 1);
  }, [acceptCart, cartHeaders]);

  const restoreBasket = useCallback(async () => {
    const snapshot = readSnapshot();
    if (!snapshot.length) {
      setRestoreCount(0);
      return;
    }
    await mutate("POST", { items: snapshot.map((item) => ({ productId: item.productId, quantity: item.quantity })) });
    clearSnapshot();
    setRestoreCount(0);
  }, [mutate]);

  const clearBasket = useCallback(async () => {
    if (!cart) return;
    for (const line of cart.lines) {
      await mutate("DELETE", undefined, `?productId=${line.productId}`);
    }
  }, [cart, mutate]);

  const quantityOf = useCallback(
    (productId: number) => cart?.lines.find((line) => line.productId === productId)?.quantity ?? 0,
    [cart],
  );

  const isPending = useCallback((productId: number) => pendingIds.includes(productId), [pendingIds]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      add,
      addMany,
      setQuantity,
      remove,
      applyCoupon,
      removeCoupon,
      refresh: fetchCart,
      pendingIds,
      isPending,
      quantityOf,
      toast,
      dismissToast: () => setToast(null),
      pulse,
      cartToken,
      restoreCount,
      restoreBasket,
      clearBasket,
    }),
    [
      add,
      addMany,
      applyCoupon,
      cart,
      cartToken,
      fetchCart,
      isOpen,
      isPending,
      loading,
      pendingIds,
      pulse,
      quantityOf,
      remove,
      removeCoupon,
      restoreBasket,
      restoreCount,
      clearBasket,
      setQuantity,
      toast,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
