import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { DeliveryProvider } from "@/components/delivery-provider";
import { SessionProvider } from "@/components/session-provider";
import { SavedProvider } from "@/components/saved-provider";
import { CartDrawer } from "@/components/cart-drawer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ToastStack } from "@/components/toast-stack";

// Fonts are self-hosted so builds never depend on a network call to Google.
const jakarta = localFont({
  src: "../fonts/jakarta-latin.woff2",
  variable: "--font-jakarta",
  weight: "400 800",
  style: "normal",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});

const fraunces = localFont({
  src: "../fonts/fraunces-latin.woff2",
  variable: "--font-fraunces",
  weight: "400 700",
  style: "normal",
  display: "swap",
  fallback: ["ui-serif", "Georgia", "serif"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fresco — Fresh groceries delivered in 30 minutes",
  description:
    "Shop farm-fresh produce, bakery, dairy and pantry staples with smart search, honest prices and 30-minute delivery. Free delivery over $35.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="bg-cream text-ink antialiased">
        <SessionProvider>
          <SavedProvider>
          <CartProvider>
            <DeliveryProvider>
              <div className="flex min-h-screen flex-col">
                <SiteHeader />
                <main className="flex-1">{children}</main>
                <SiteFooter />
              </div>
              <CartDrawer />
              <ToastStack />
            </DeliveryProvider>
          </CartProvider>
          </SavedProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
