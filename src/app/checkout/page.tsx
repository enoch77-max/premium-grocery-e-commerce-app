import type { Metadata } from "next";
import { getCoupons } from "@/lib/store";
import { CheckoutForm } from "@/components/checkout-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout — Fresco",
  description: "Friction-free checkout: 30-second form, saved basket, free delivery over $35.",
};

export default async function CheckoutPage() {
  const coupons = await getCoupons();
  return <CheckoutForm coupons={coupons} />;
}
