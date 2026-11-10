import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Fresco — Staff sign in",
  robots: { index: false, follow: false },
};

/**
 * The sign-in route lives outside the guarded `(dashboard)` group on purpose:
 * the dashboard layout redirects unauthenticated visitors here, so guarding this
 * page too would create a redirect loop and lock the owner out.
 */
export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
