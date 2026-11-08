/**
 * Customer journey smoke test (run manually):
 *   PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 node scripts/customer-journey.cjs
 * Requires `playwright` installed outside the app dependencies.
 */
const { chromium } = require("/tmp/pw/node_modules/playwright");

const B = process.env.BASE_URL || "http://127.0.0.1:3000";

const visibleCount = async (page, selector) => {
  const all = page.locator(selector);
  const count = await all.count();
  let visible = 0;
  for (let i = 0; i < count; i += 1) if (await all.nth(i).isVisible()) visible += 1;
  return visible;
};

const accountOrders = (page) =>
  page.evaluate(async () => {
    const token = localStorage.getItem("fresco:session-token");
    const response = await fetch("/api/account/orders", { headers: { "x-session-token": token || "" } });
    const data = await response.json();
    return data.orders ? data.orders.length : -1;
  });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1336, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text().slice(0, 100));
  });

  await page.goto(`${B}/login`, { waitUntil: "networkidle" });
  await page.click("text=Sign in with the demo account");
  await page.waitForTimeout(2500);
  console.log("1. demo one-click sign-in ->", page.url().replace(B, ""), "| header:", (await page.locator("header").innerText()).includes("Jordan"));

  await page.goto(`${B}/category/fresh-produce`, { waitUntil: "networkidle" });
  await page.locator('button:has-text("Add to basket")').first().click();
  await page.waitForTimeout(1000);
  await page.goto(`${B}/product/wild-yeast-sourdough`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Add to basket")');
  await page.waitForTimeout(1200);
  await page.click('button[aria-label="Open basket"]');
  await page.waitForTimeout(700);
  const drawer = await page.locator("aside").innerText();
  console.log("2. basket items parsed:", (drawer.match(/(\d+) items/) || [])[0] || "n/a", "| subtotal:", drawer.includes("Subtotal"));

  await page.click("text=Have a promo code?");
  await page.fill('input[placeholder="FRESH10"]', "SAVE15");
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(1200);
  const drawerAfterCoupon = await page.locator("aside").innerText();
  console.log("3. coupon applied or saved:", /SAVE15 applied|saved to your basket/.test(drawerAfterCoupon));

  await page.locator('aside a[href="/checkout"]').click();
  await page.waitForTimeout(2000);
  console.log("4a. visible Place order buttons (desktop):", await visibleCount(page, 'button:has-text("Place order")'));
  const checkout = await page.locator("main").innerText();
  console.log("4b. prefill address:", await page.inputValue('input[placeholder="402 7th Avenue, Apt 3B"]'), "| postcode:", await page.inputValue('input[placeholder="11215"]'));
  console.log("4c. no stale banner:", !checkout.includes("already been checked out"));

  const before = await accountOrders(page);
  const submit = page.locator('button[form="checkout-form"]');
  await submit.click();
  await page.waitForTimeout(120);
  await submit.click({ force: true }).catch(() => {});
  await page.waitForTimeout(4500);
  const after = await accountOrders(page);
  console.log("5a. landed on:", page.url().replace(B, ""));
  console.log("5b. orders before/after double click:", before, "->", after);

  const confirmation = await page.locator("main").innerText();
  console.log("6a. tracking page:", confirmation.includes("confirmed"), "| timeline:", confirmation.includes("Packed fresh"), "| item:", confirmation.includes("Sourdough"));
  console.log("6b. basket cleared in header:", (await page.locator("header").innerText()).includes("$0.00"));

  await page.goto(`${B}/checkout`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const afterOrder = await page.locator("main").innerText();
  console.log("7. checkout after order -> empty state:", afterOrder.includes("Nothing to check out yet"), "| false error absent:", !afterOrder.includes("Your basket is empty."));

  await page.goto(`${B}/account/orders`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await page.locator("text=Details").first().click();
  await page.waitForTimeout(1800);
  const detail = await page.locator("main").innerText();
  console.log("8a. order detail timeline:", detail.includes("Confirmed") && detail.includes("Packing"), "| total block:", detail.includes("Total"));

  await page.click('button:has-text("Reorder these items")');
  await page.waitForTimeout(2200);
  console.log("8b. reorder opened basket:", (await page.locator("aside").count()) > 0);
  await page.keyboard.press("Escape");

  await page.goto(`${B}/product/organic-bananas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1300);
  const pressedBefore = await page.locator("button[aria-pressed]").first().getAttribute("aria-pressed");
  await page.locator("button[aria-pressed]").first().click();
  await page.waitForTimeout(1300);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const pressedAfter = await page.locator("button[aria-pressed]").first().getAttribute("aria-pressed");
  console.log("9. heart persisted:", pressedBefore, "->", pressedAfter);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${B}/login`, { waitUntil: "networkidle" });
  await mobile.click("text=Sign in with the demo account");
  await mobile.waitForTimeout(2200);
  await mobile.goto(`${B}/product/organic-bananas`, { waitUntil: "networkidle" });
  await mobile.click('button:has-text("Add to basket")');
  await mobile.waitForTimeout(1200);
  await mobile.goto(`${B}/checkout`, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(1800);
  console.log("10. visible Place order buttons (mobile):", await visibleCount(mobile, 'button:has-text("Place order")'));

  console.log("errors:", errors.length ? errors.slice(0, 4) : "none");
  await browser.close();
})().catch((error) => {
  console.error("FAILED", error.message);
  process.exit(1);
});
