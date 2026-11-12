/**
 * Tiny HTTP test harness — no extra dependencies.
 *   node --test tests/
 */
export const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";

export async function json(path, init = {}) {
  const response = await fetch(BASE + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body, headers: response.headers };
}

/** Signs in and returns the bearer token + cookie string. */
export async function signIn(email, password) {
  const response = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  const cookie = (response.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  return { token: body.token, cookie, user: body.user };
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}
