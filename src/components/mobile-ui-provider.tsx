"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type MobileUiValue = {
  searchOpen: boolean;
  menuOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  openMenu: () => void;
  closeMenu: () => void;
};

const MobileUiContext = createContext<MobileUiValue | null>(null);

/**
 * Owns the two chrome-level overlays (search + aisle menu) so the sticky header
 * and the phone-only bottom tab bar can drive the same state without prop
 * drilling through the server-rendered layout.
 */
export function MobileUiProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Navigating from inside an overlay must dismiss it — on a phone there is no
  // visible "back" affordance to say the sheet is still open.
  useEffect(() => {
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const value = useMemo(
    () => ({ searchOpen, menuOpen, openSearch, closeSearch, openMenu, closeMenu }),
    [searchOpen, menuOpen, openSearch, closeSearch, openMenu, closeMenu],
  );

  return <MobileUiContext.Provider value={value}>{children}</MobileUiContext.Provider>;
}

export function useMobileUi() {
  const context = useContext(MobileUiContext);
  if (!context) throw new Error("useMobileUi must be used inside MobileUiProvider");
  return context;
}
