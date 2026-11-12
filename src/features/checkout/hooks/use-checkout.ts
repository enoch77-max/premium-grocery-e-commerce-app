"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormState } from "@/features/checkout/types";
import { useCart } from "@/components/cart-provider";
import { useDelivery } from "@/components/delivery-provider";
import { useSession } from "@/components/session-provider";
import { useAccountAddresses } from "@/components/account/data";
import { SERVICE_AREAS, isServiceable } from "@/lib/delivery";

const serviceAreaFor = (postcode: string) =>
  SERVICE_AREAS.find((area) => area.postcode === postcode.trim()) ?? null;

const initialForm: FormState = {
  customerName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postcode: "11215",
  notes: "",
};

/**
 * All checkout behaviour in one place: form state, profile and address prefill,
 * coupon handling and the idempotent submit. The view stays declarative.
 */
export function useCheckout() {
  const router = useRouter();
  const {
    cart,
    loading,
    add,
    applyCoupon,
    removeCoupon,
    isPending,
    quantityOf,
    refresh,
    cartToken,
    restoreCount,
    restoreBasket,
    openCart,
  } = useCart();
  const { user, token: sessionToken } = useSession();
  const { addresses } = useAccountAddresses();
  const { area, slot, setSlot, openPicker } = useDelivery();
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    postcode: area.postcode,
    city: area.city,
  });
  const [addressTouched, setAddressTouched] = useState(false);
  const [payment, setPayment] = useState("card");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [staleBasket, setStaleBasket] = useState(false);
  const submittingRef = useRef(false);

  // One idempotency key per basket. Retried submits reuse it so the API
  // returns the original order instead of "basket is empty" or a duplicate.
  const checkoutKeyRef = useRef<string | null>(null);
  const getCheckoutId = useCallback(() => {
    if (checkoutKeyRef.current) return checkoutKeyRef.current;
    const storageKey = `fresco:checkout:${cartToken ?? "guest"}`;
    let key: string | null = null;
    try {
      key = window.sessionStorage.getItem(storageKey);
      if (!key) {
        key = globalThis.crypto.randomUUID();
        window.sessionStorage.setItem(storageKey, key);
      }
    } catch {
      key = globalThis.crypto.randomUUID();
    }
    checkoutKeyRef.current = key;
    return key;
  }, [cartToken]);

  // Keep the address in sync with the chosen delivery area until the shopper
  // edits it themselves, so the picker feels connected instead of decorative.
  useEffect(() => {
    if (addressTouched) return;
    setForm((prev) => ({ ...prev, postcode: area.postcode, city: area.city }));
  }, [area, addressTouched]);

  // Signed-in shoppers get their profile applied once it is known.
  const [profileApplied, setProfileApplied] = useState(false);
  useEffect(() => {
    if (!user || profileApplied) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || user.name,
      email: prev.email || user.email,
      phone: prev.phone || user.phone,
    }));
    setProfileApplied(true);
  }, [profileApplied, user]);

  // Saved addresses arrive asynchronously — apply the default whenever they
  // land, unless the shopper has already typed their own address.
  useEffect(() => {
    if (addressTouched) return;
    const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
    if (!preferred) return;
    const street = `${preferred.line1}${preferred.line2 ? `, ${preferred.line2}` : ""}`;
    setForm((prev) =>
      prev.address === street && prev.postcode === preferred.postcode
        ? prev
        : {
            ...prev,
            customerName: prev.customerName || preferred.recipient,
            phone: prev.phone || preferred.phone,
            address: street,
            city: preferred.city,
            postcode: preferred.postcode,
            notes: prev.notes || preferred.instructions,
          },
    );
  }, [addresses, addressTouched]);

  const update = (key: keyof FormState, value: string) => {
    if (key === "postcode" || key === "city") setAddressTouched(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Typing a postcode we serve fills the matching city automatically.
      if (key === "postcode") {
        const match = serviceAreaFor(value);
        if (match) next.city = match.city;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Ref guard: state updates are async, so two quick clicks could both pass.
    if (submittingRef.current) return;
    if (!cart?.lines.length) {
      setStaleBasket(true);
      void refresh();
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (form.customerName.trim().length < 2) nextErrors.customerName = "Please tell us your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) nextErrors.email = "Enter a valid email";
    if (form.address.trim().length < 4) nextErrors.address = "Add a street address";
    if (form.city.trim().length < 2) nextErrors.city = "Add a city";
    if (form.postcode.trim().length < 3) nextErrors.postcode = "Add a postcode";
    else if (!isServiceable(form.postcode)) {
      nextErrors.postcode = "We don't deliver here yet — change your area above";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setServerError("Almost there — a few fields need your attention.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    setStaleBasket(false);
    try {
      const orderHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (cartToken) orderHeaders["x-cart-token"] = cartToken;
      if (sessionToken) orderHeaders["x-session-token"] = sessionToken;
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: orderHeaders,
        body: JSON.stringify({
          ...form,
          deliverySlot: slot,
          paymentMethod: payment,
          checkoutId: getCheckoutId(),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        orderNumber?: string;
        error?: string;
        errors?: Record<string, string>;
        code?: string;
      } | null;

      if (!response.ok || !data?.orderNumber) {
        setErrors(data?.errors ?? {});
        setServerError(data?.error ?? "We couldn't place the order. Please try again.");
        if (data?.code === "EMPTY_BASKET") {
          await refresh();
          // Only treat it as already-ordered if the basket is genuinely gone.
          const latest = await fetch("/api/cart", { cache: "no-store" })
            .then((r) => r.json())
            .catch(() => null);
          const stillHasItems = Boolean(
            (latest as { cart?: { lines?: unknown[] } } | null)?.cart?.lines?.length,
          );
          if (!stillHasItems) setStaleBasket(true);
          else setServerError("Your basket changed — please review and place the order again.");
        }
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      // Clear the cached submission key so the next shop starts fresh.
      try {
        window.sessionStorage.removeItem(`fresco:checkout:${cartToken ?? "guest"}`);
      } catch {
        // ignore
      }
      await refresh();
      router.push(`/order/${data.orderNumber}`);
    } catch {
      setServerError("Network hiccup — please try again.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return {
    router,
    cart,
    loading,
    user,
    addresses,
    area,
    slot,
    setSlot,
    openPicker,
    form,
    setForm,
    update,
    errors,
    setErrors,
    serverError,
    submitting,
    couponInput,
    setCouponInput,
    couponMessage,
    applyCoupon,
    removeCoupon,
    staleBasket,
    submit,
    restoreCount,
    restoreBasket,
    openCart,
    add,
    isPending,
    quantityOf,
    refresh,
    payment,
    setPayment,
    setAddressTouched,
  };
}
