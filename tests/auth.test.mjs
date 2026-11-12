import { test } from "node:test";
import { assert, json, signIn } from "./http.mjs";

const EMAIL = process.env.DEMO_EMAIL || "demo@rymthos.dev";
const PASSWORD = process.env.DEMO_PASSWORD || "rymthosdemo";

/**
 * The app rate-limits login attempts (10/min per client) — deliberately. Tests run
 * against one client, so they share a single session instead of hammering the
 * endpoint, mirroring what a real browser does.
 */
let session;

test("login rejects a wrong password", async () => {
  const { status } = await json("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: "definitely-wrong" }),
  });
  // 429 is also acceptable: it proves the limiter is doing its job.
  assert(status === 401 || status === 429, `expected 401/429, got ${status}`);
});

test("login returns a session for the configured demo account", async () => {
  session = await signIn(EMAIL, PASSWORD);
  assert(Boolean(session.token), "no token issued");
  assert(session.user?.email === EMAIL, `unexpected identity ${session.user?.email}`);
});

test("session resolves by cookie alone", async () => {
  const me = await json("/api/auth/me", { headers: { cookie: session.cookie } });
  assert(me.body?.user?.id === session.user.id, "cookie-only session failed");
});

test("logout invalidates the token", async () => {
  const fresh = await signIn(EMAIL, PASSWORD);
  await json("/api/auth/logout", { method: "POST", headers: { "x-session-token": fresh.token } });
  const me = await json("/api/auth/me", { headers: { "x-session-token": fresh.token } });
  assert(me.body?.user === null, "token still valid after logout");
});

test("admin routes reject customers", async () => {
  const { status } = await json("/api/admin/overview", { headers: { "x-session-token": session.token } });
  assert(status === 401 || status === 403, `expected 401/403, got ${status}`);
});
