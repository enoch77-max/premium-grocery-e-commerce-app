/**
 * Uptime probe for cron / external monitors.
 *   BASE_URL=https://shop.example node scripts/healthcheck.mjs
 * Exits 1 on the first failure so a monitor can alert.
 */
const base = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const targets = [
  { path: "/api/health", expect: 200 },
  { path: "/api/ready", expect: 200 },
  { path: "/", expect: 200 },
];

let failed = false;
for (const target of targets) {
  const started = Date.now();
  try {
    const response = await fetch(base + target.path, { signal: AbortSignal.timeout(10_000) });
    const ms = Date.now() - started;
    const ok = response.status === target.expect;
    if (!ok) failed = true;
    console.log(`${ok ? "OK " : "FAIL"} ${target.path} ${response.status} ${ms}ms`);
    if (target.path === "/api/ready") {
      const body = await response.json().catch(() => ({}));
      console.log("     checks:", JSON.stringify(body.checks ?? {}));
    }
  } catch (error) {
    failed = true;
    console.log(`FAIL ${target.path} ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
