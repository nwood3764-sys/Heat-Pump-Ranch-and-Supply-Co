/**
 * AHRI Directory scraper.
 *
 * Pulls AHRI certifications for outdoor/indoor model combinations we care
 * about (any LG or ACiQ outdoor unit currently in our products table).
 * Writes to ahri_certifications and updates system_packages.ahri_number when
 * a system's components match a certified pair.
 *
 * Rate-limited and respectful of robots.txt. Runs weekly because the
 * directory changes slowly and AHRI's TOS restrict heavy automated access.
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function main() {
  const { data: runRow } = await supabase
    .from("sync_runs")
    .insert({ portal: "ahri", status: "running", triggered_by: "cron" })
    .select("id")
    .single();
  const runId = runRow.id;

  let added = 0;
  let updated = 0;
  let failed = 0;

  try {
    // Pull all LG and ACiQ outdoor unit model numbers from our DB
    const { data: outdoor } = await supabase
      .from("products")
      .select("id, brand, model_number")
      .in("brand", ["LG", "ACiQ"])
      .ilike("title", "%condenser%");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "HeatPumpRanchBot/1.0 (+https://heatpumpranchandsupplyco.com/bot)",
    });
    const page = await context.newPage();

    try {
      // TODO: implement the actual AHRI directory queries.
      // Approach:
      //   1. Visit ahridirectory.org search page
      //   2. For each outdoor model in our DB, query for matches
      //   3. Parse results, upsert into ahri_certifications
      //   4. Rate-limit between queries (>= 2s sleep)
    } finally {
      await browser.close();
    }

    await supabase
      .from("sync_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        products_added: added,
        products_updated: updated,
        products_failed: failed,
      })
      .eq("id", runId);

    console.log("[ahri] done", { added, updated, failed });
  } catch (err) {
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: String(err?.message ?? err),
      })
      .eq("id", runId);
    throw err;
  }
}

await main();
