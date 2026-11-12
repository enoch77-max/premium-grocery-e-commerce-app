"use client";

import { useEffect, useRef, useState } from "react";
import { CardIcon, CheckIcon, ShieldIcon } from "@/components/icons";
import { Notice } from "@/features/recurring/ui/primitives";
import type { GatewayStatus } from "@/features/recurring/hooks/use-recurring";

/**
 * Secure card capture.
 *
 * Cards are tokenised by the gateway, never by this app. Two honest states:
 *
 *  1. A publishable key exists → we load Stripe.js and mount its hosted card
 *     fields in an iframe (the card number never touches our JS or our server),
 *     then exchange the result for `cus_…` + `pm_…` tokens via our API.
 *  2. No key → we say so plainly and offer the saved-method path. We do **not**
 *     render a fake card form that pretends to work.
 *
 * Either way the server rejects anything that looks like a PAN.
 */
type StripeLike = {
  elements: (options: { clientSecret?: string; mode?: string; amount?: number; currency?: string }) => {
    create: (type: string) => { mount: (el: HTMLElement) => void; destroy: () => void };
  };
  confirmSetup: (options: { elements: unknown; confirmParams: { return_url: string } }) => Promise<{
    error?: { message?: string };
    setupIntent?: { payment_method?: string };
  }>;
};

declare global {
  interface Window {
    Stripe?: (key: string) => StripeLike;
  }
}

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export function PaymentSetup({
  gateway,
  onSaved,
}: {
  gateway: GatewayStatus;
  onSaved: () => void | Promise<void>;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<StripeLike | null>(null);
  const elementsRef = useRef<unknown>(null);
  const cardRef = useRef<{ mount: (el: HTMLElement) => void; destroy: () => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!PUBLISHABLE_KEY) return;
    let cancelled = false;

    const boot = async () => {
      try {
        if (!window.Stripe) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://js.stripe.com/v3/";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("stripe.js failed"));
            document.head.appendChild(script);
          });
        }
        if (cancelled || !window.Stripe || !mountRef.current) return;

        // The server creates a SetupIntent so the card can be saved for off-session use.
        const response = await fetch("/api/recurring/payment-methods/setup-intent", { method: "POST" });
        if (!response.ok) return;
        const { clientSecret, customerToken } = (await response.json()) as {
          clientSecret?: string;
          customerToken?: string;
        };
        if (!clientSecret) return;

        const stripe = window.Stripe(PUBLISHABLE_KEY);
        stripeRef.current = stripe;
        const elements = stripe.elements({ clientSecret });
        elementsRef.current = elements;
        const card = elements.create("payment");
        card.mount(mountRef.current);
        cardRef.current = card;
        sessionStorage.setItem("recurring:customerToken", customerToken ?? "");
        setReady(true);
      } catch {
        setReady(false);
      }
    };

    void boot();
    return () => {
      cancelled = true;
      cardRef.current?.destroy();
    };
  }, []);

  const save = async () => {
    if (!stripeRef.current) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await stripeRef.current.confirmSetup({
        elements: elementsRef.current,
        confirmParams: { return_url: window.location.href },
      });
      const methodToken = result.setupIntent?.payment_method;
      const customerToken = sessionStorage.getItem("recurring:customerToken") ?? "";
      if (!methodToken) {
        setMessage(
          result.error?.message ??
            "Your bank didn't confirm that card. Nothing was saved and nothing has been charged.",
        );
        return;
      }
      const response = await fetch("/api/recurring/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: "stripe",
          gatewayCustomerToken: customerToken,
          gatewayPaymentMethodToken: methodToken,
          brand: "card",
        }),
      });
      if (!response.ok) {
        setMessage("We couldn't save that card just now. Nothing has been charged — want to try again?");
        return;
      }
      await onSaved();
      setMessage("Card saved. You're all set.");
    } catch {
      setMessage("We couldn't reach your bank just now. Nothing has been charged.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line/80 bg-white p-4">
      <h2 className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink">
        <CardIcon className="h-4 w-4 text-brand" /> Payment method
      </h2>

      {PUBLISHABLE_KEY ? (
        <>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
            Your card is handled by our payment provider. We only ever see a secure token — never your card
            number.
          </p>
          <div ref={mountRef} className="mt-3" aria-label="Card details" />
          <button
            type="button"
            onClick={() => void save()}
            disabled={!ready || busy}
            className="press mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-[13px] font-bold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save this card"}
          </button>
        </>
      ) : (
        <>
          <Notice tone="warn">
            Card setup isn&apos;t switched on for this store yet — so we can&apos;t save a card and we will
            never charge you automatically. Your list is still saved, and nothing is billed.
          </Notice>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
            {gateway.configured
              ? "A gateway is configured but no publishable key was provided to this page."
              : "Ask the store owner to connect a payment provider. Until then, recurring lists stay as a saved shopping list."}
          </p>
        </>
      )}

      {message ? (
        <p
          className="mt-2 flex items-start gap-1.5 text-[11.5px] font-semibold text-brand-deep"
          role="status"
        >
          <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {message}
        </p>
      ) : null}

      <p className="mt-3 flex items-start gap-1.5 border-t border-line/70 pt-2.5 text-[10.5px] leading-relaxed text-ink-soft">
        <ShieldIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
        By saving this card you agree that Fresco may charge it automatically for each delivery you schedule.
        You can pause or cancel any time, and we&apos;ll email you a receipt every time.
      </p>
    </div>
  );
}
