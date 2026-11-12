/**
 * Basket persistence helpers: the token that identifies the basket and a local
 * snapshot used to restore an abandoned basket. All reads/writes tolerate
 * blocked storage (private mode, partitioned iframes).
 */
const CART_TOKEN_KEY = "fresco:cart-token";
const SNAPSHOT_KEY = "fresco:cart-snapshot";

export type SnapshotItem = { productId: number; quantity: number };

export function readToken() {
  try {
    return window.localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(CART_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function writeSnapshot(lines: SnapshotItem[]) {
  try {
    if (lines.length) window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(lines));
  } catch {
    // ignore
  }
}

export function clearSnapshot() {
  try {
    window.localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

export function readSnapshot(): SnapshotItem[] {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SnapshotItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => Number.isFinite(item.productId)) : [];
  } catch {
    return [];
  }
}
