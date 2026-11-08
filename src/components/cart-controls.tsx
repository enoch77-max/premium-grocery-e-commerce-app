"use client";

import type { Product } from "@/lib/types";
import { useCart } from "@/components/cart-provider";
import { CheckIcon, MinusIcon, PlusIcon } from "@/components/icons";

export function CartControls({
  product,
  size = "md",
  label = "Add to basket",
  tone = "solid",
}: {
  product: Pick<Product, "id" | "name" | "imageUrl" | "unit"> & { stock?: number };
  size?: "sm" | "md" | "lg";
  label?: string;
  tone?: "solid" | "soft";
}) {
  const { add, setQuantity, quantityOf, isPending } = useCart();
  const quantity = quantityOf(product.id);
  const pending = isPending(product.id);
  const maxQuantity = Math.max(1, Math.min(20, product.stock ?? 20));
  const atLimit = quantity >= maxQuantity;

  const height = size === "lg" ? "h-12" : size === "sm" ? "h-8" : "h-9";
  const radius = size === "lg" ? "rounded-full" : "rounded-xl";

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void add(product);
        }}
        disabled={pending}
        className={`press flex w-full ${height} items-center justify-center gap-1.5 ${radius} ${
          tone === "solid"
            ? "border border-brand/25 bg-brand-soft/70 text-brand-deep hover:border-brand hover:bg-brand hover:text-white"
            : "border border-line bg-white text-ink hover:border-brand hover:text-brand"
        } ${size === "lg" ? "text-[14px]" : "text-[12px]"} font-bold disabled:opacity-60`}
      >
        {pending ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <PlusIcon className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={2.4} />
        )}
        {label}
      </button>
    );
  }

  return (
    <div
      className={`flex w-full ${height} items-center justify-between ${radius} border border-brand/25 bg-brand-soft/60 px-1`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void setQuantity(product.id, quantity - 1);
        }}
        disabled={pending}
        aria-label="Decrease quantity"
        className="press grid h-7 w-7 place-items-center rounded-full bg-white text-brand-deep hover:bg-cream-deep disabled:opacity-50"
      >
        <MinusIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
      <span className={`flex items-center gap-1 text-[12px] font-extrabold text-brand-deep ${pending ? "opacity-60" : ""}`}>
        {pending ? <CheckIcon className="h-3.5 w-3.5" /> : null}
        {quantity} in basket
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void setQuantity(product.id, quantity + 1);
        }}
        disabled={pending || atLimit}
        aria-label={atLimit ? `Maximum available quantity of ${product.name} reached` : "Increase quantity"}
        title={atLimit ? `Only ${maxQuantity} available today` : undefined}
        className="press grid h-7 w-7 place-items-center rounded-full bg-white text-brand-deep hover:bg-cream-deep disabled:opacity-40"
      >
        <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
      </button>
    </div>
  );
}
