"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";

/**
 * The basket drawer is interaction-only: nobody needs its JS until they open it.
 * Mounting it lazily keeps ~its whole module out of the initial bundle — the
 * chunk is fetched the first time `isOpen` flips true.
 */
const CartDrawer = dynamic(() => import("@/components/cart-drawer").then((m) => m.CartDrawer), {
  ssr: false,
});

export function LazyCartDrawer() {
  const { isOpen } = useCart();
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    if (isOpen) setEverOpened(true);
  }, [isOpen]);

  if (!everOpened) return null;
  return <CartDrawer />;
}
