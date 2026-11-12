import type { Metadata } from "next";
import { getCoupons } from "@/lib/store";
import { getStoreSettings } from "@/lib/admin";
import { CheckoutForm } from "@/components/checkout-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout — Fresco",
  description: "Friction-free checkout: 30-second form, saved basket, free delivery over $35.",
};

export default async function CheckoutPage() {
  const [coupons, settings] = await Promise.all([getCoupons(), getStoreSettings()]);
  return (
    <CheckoutForm coupons={coupons} storeOpen={settings.storeOpen} supportEmail={settings.supportEmail} />
  );
}
