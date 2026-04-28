/**
 * ACIQ distributor portal scraper (portal.aciq.com).
 *
 * The portal is a Magento backend; product detail and pricing live behind
 * a dealer login. The shape of the scraper is correct here — login, paginate,
 * extract product fields, hand off to the shared runner.
 *
 * To run locally:
 *   export SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   export ACIQ_PORTAL_USERNAME=...
 *   export ACIQ_PORTAL_PASSWORD=...
 *   node sync-aciq.mjs
 */

import { chromium } from "playwright";
import { runSync } from "./sync-runner.mjs";

await runSync({
  portal: "aciq",
  scrape: async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: false });
    const page = await context.newPage();

    try {
      // ---- LOGIN -----------------------------------------------------------
      await page.goto("https://portal.aciq.com/customer/account/login/", {
        waitUntil: "domcontentloaded",
      });
      // TODO: replace selectors after first manual test
      // await page.fill('#email', process.env.ACIQ_PORTAL_USERNAME);
      // await page.fill('#pass', process.env.ACIQ_PORTAL_PASSWORD);
      // await page.click('#send2');
      // await page.waitForURL(/customer\/account/);

      // ---- ENUMERATE PRODUCTS ---------------------------------------------
      // Walk the catalog by category and pagination. Each product page has:
      //   - SKU, model number, title
      //   - specs table (BTU, SEER2, voltage, refrigerant)
      //   - main image and gallery
      //   - resource documents (spec sheet, install manual, warranty)
      //   - wholesale price
      //
      // We also scrape hvacdirect.com for the matching ACiQ product to get
      // public MSRP — that gets passed in as `pricing.msrp`.
      const products = [];

      return { products };
    } finally {
      await browser.close();
    }
  },
});
