"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { previewEdgeMessage } from "@/lib/preview-edge";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  phone: string;
  marketingOptIn: boolean;
  orderUpdatesEmail?: boolean;
  orderUpdatesSms?: boolean;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  whatsappNumber?: string;
  role?: string;
  createdAt: string;
};

type AuthResult = { ok: boolean; message: string };

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    name: string,
    email: string,
    password: string,
    marketingOptIn: boolean,
    phone?: string,
  ) => Promise<AuthResult>;
  loginDemo: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<SessionUser | null>;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  setUser: (user: SessionUser | null) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const TOKEN_KEY = "fresco:session-token";
const CART_TOKEN_KEY = "fresco:cart-token";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);
  /**
   * Invalidates in-flight /api/auth/me calls.
   *
   * On mount we call refresh(). If the user signs in before that request comes
   * back (slow network, slow device, embedded preview), the stale response would
   * land afterwards, see "no user", and wipe the session we just created — which
   * is why the account page flashed and bounced back to sign-in. Every sign-in,
   * sign-out and password change bumps this counter so older responses are ignored.
   */
  const epochRef = useRef(0);

  const saveToken = useCallback((next: string | null) => {
    tokenRef.current = next;
    setToken(next);
    try {
      if (next) window.localStorage.setItem(TOKEN_KEY, next);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }, []);

  const authFetch = useCallback(async (input: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");
    if (tokenRef.current) headers.set("x-session-token", tokenRef.current);
    // Account actions such as reorder mutate the basket, so they must carry the
    // same cart token the storefront reads. Without this the server writes to a
    // different cart and the UI appears empty.
    try {
      const cartToken = window.localStorage.getItem(CART_TOKEN_KEY);
      if (cartToken) headers.set("x-cart-token", cartToken);
    } catch {
      // storage unavailable — the cookie still identifies the basket
    }
    return fetch(input, { ...init, headers, cache: "no-store" });
  }, []);

  const refresh = useCallback(async () => {
    const epoch = epochRef.current;
    let stored = tokenRef.current;
    if (!stored) {
      try {
        stored = window.localStorage.getItem(TOKEN_KEY);
      } catch {
        stored = null;
      }
    }
    try {
      const headers = new Headers();
      if (stored) headers.set("x-session-token", stored);
      const response = await fetch("/api/auth/me", { headers, cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { user?: SessionUser | null } | null;

      // A sign-in or sign-out happened while this was in flight: its answer is
      // already stale, so drop it rather than overwriting the live session.
      if (epoch !== epochRef.current) return null;

      const nextUser = data?.user ?? null;
      if (nextUser) {
        tokenRef.current = stored;
        setToken(stored);
        setUser(nextUser);
      } else if (!stored) {
        // Only clear when we genuinely had nothing to authenticate with.
        setUser(null);
      } else {
        // Token was rejected (expired / revoked): clear it.
        saveToken(null);
        setUser(null);
      }
      return nextUser;
    } catch {
      return null;
    } finally {
      if (epoch === epochRef.current) setLoading(false);
    }
  }, [saveToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => null)) as {
        user?: SessionUser;
        token?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.user || !data.token) {
        const edge = await previewEdgeMessage(response);
        return { ok: false, message: edge ?? data?.error ?? "We couldn't sign you in." };
      }
      epochRef.current += 1;
      saveToken(data.token);
      setUser(data.user);
      setLoading(false);
      return { ok: true, message: `Welcome back, ${data.user.name.split(" ")[0]}` };
    },
    [saveToken],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      marketingOptIn: boolean,
      phone = "",
    ): Promise<AuthResult> => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone, marketingOptIn }),
      });
      const data = (await response.json().catch(() => null)) as {
        user?: SessionUser;
        token?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.user || !data.token) {
        const edge = await previewEdgeMessage(response);
        return { ok: false, message: edge ?? data?.error ?? "We couldn't create your account." };
      }
      epochRef.current += 1;
      saveToken(data.token);
      setUser(data.user);
      setLoading(false);
      return { ok: true, message: `Account created — welcome, ${data.user.name.split(" ")[0]}` };
    },
    [saveToken],
  );

  const loginDemo = useCallback(async (): Promise<AuthResult> => {
    const response = await fetch("/api/auth/demo", { method: "POST" });
    const data = (await response.json().catch(() => null)) as {
      user?: SessionUser;
      token?: string;
      error?: string;
    } | null;
    if (!response.ok || !data?.user || !data.token) {
      const edge = await previewEdgeMessage(response);
      return { ok: false, message: edge ?? data?.error ?? "The demo account is unavailable right now." };
    }
    epochRef.current += 1;
    saveToken(data.token);
    setUser(data.user);
    setLoading(false);
    return { ok: true, message: `Signed in as ${data.user.name}` };
  }, [saveToken]);

  const logout = useCallback(async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } finally {
      epochRef.current += 1;
      saveToken(null);
      setUser(null);
    }
  }, [authFetch, saveToken]);

  const value = useMemo<SessionContextValue>(
    () => ({ user, loading, token, login, register, loginDemo, logout, refresh, authFetch, setUser }),
    [authFetch, loading, login, loginDemo, logout, refresh, register, token, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
