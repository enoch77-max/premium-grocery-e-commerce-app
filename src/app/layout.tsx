import type { Metadata, Viewport } from "next";
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
import { MobileUiProvider } from "@/components/mobile-ui-provider";
import { MobileTabBar } from "@/components/mobile-tab-bar";

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

// viewport-fit=cover lets the layout draw edge-to-edge and then pad itself with
// env(safe-area-inset-*), so notches and home indicators never cover content.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a5637" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="bg-cream text-ink antialiased">
        <SessionProvider>
          <SavedProvider>
          <CartProvider>
            <DeliveryProvider>
              <MobileUiProvider>
                {/* pb-tabbar keeps the whole document (footer included) clear of
                    the phone-only bottom navigation. */}
                <div className="pb-tabbar flex min-h-[100dvh] flex-col">
                  <SiteHeader />
                  <main className="flex-1">{children}</main>
                  <SiteFooter />
                </div>
                <MobileTabBar />
                <CartDrawer />
                <ToastStack />
              </MobileUiProvider>
            </DeliveryProvider>
          </CartProvider>
          </SavedProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
