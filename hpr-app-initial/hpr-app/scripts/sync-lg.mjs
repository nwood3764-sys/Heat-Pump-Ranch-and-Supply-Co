/**
 * LG distributor portal scraper.
 *
 * The exact selectors and URLs need to be filled in once we can test against
 * the live LG portal with valid dealer credentials. This file is structured
 * so only the inner scrape() logic needs to change — the runSync() framework
 * around it handles reconciliation, image rehosting, pricing diffs, etc.
 *
 * To run locally:
 *   export SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   export LG_PORTAL_USERNAME=...
 *   export LG_PORTAL_PASSWORD=...
 *   node sync-lg.mjs
 */

import { chromium } from "playwright";
import { runSync } from "./sync-runner.mjs";

await runSync({
  portal: "lg",
  scrape: async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: false });
    const page = await context.newPage();

    try {
      // ---- LOGIN -----------------------------------------------------------
      // TODO: replace with the actual LG portal URL and selectors.
      // The shape is correct; the strings need to be confirmed against the
      // real portal once we can sign in.
      await page.goto("https://www.lghvac.com/", { waitUntil: "domcontentloaded" });
      // await page.fill('input[name="username"]', process.env.LG_PORTAL_USERNAME);
      // await page.fill('input[name="password"]', process.env.LG_PORTAL_PASSWORD);
      // await page.click('button[type="submit"]');
      // await page.waitForURL(/dashboard|portal/);

      // ---- ENUMERATE PRODUCTS ---------------------------------------------
      // The previous Manus build used lghvac.com's spec API. Likely the right
      // approach here too — request JSON product feeds rather than scrape HTML.
      // Until we confirm the endpoint, return an empty list so the runner
      // exits cleanly.
      const products = [];

      return { products };
    } finally {
      await browser.close();
    }
  },
});
