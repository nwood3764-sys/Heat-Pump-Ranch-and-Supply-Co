#!/usr/bin/env node
/**
 * Refresh / validate the cached ACiQ portal session.
 *
 * Usage:
 *   node refresh-aciq-session.mjs                  # Validate existing, login if expired
 *   node refresh-aciq-session.mjs --force           # Force fresh login even if session is valid
 *   node refresh-aciq-session.mjs --validate-only   # Just check if current session is alive
 *   node refresh-aciq-session.mjs --import-cookie PHPSESSID=abc123  # Import a manually-obtained cookie
 *
 * This script is designed to be run:
 *   1. Manually when you know the session expired
 *   2. As a GitHub Actions step before the sync
 *   3. Via workflow_dispatch when the nightly sync fails
 *
 * When --import-cookie is used, you can paste a PHPSESSID from a browser
 * session (e.g., after manually logging in through the reCAPTCHA). This
 * bypasses the 2Captcha solve entirely and is the most reliable fallback
 * when automated CAPTCHA solving fails repeatedly.
 *
 * Required env:
 *   ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD  (for automated login)
 *   TWOCAPTCHA_API_KEY                            (for automated login)
 *   ACIQ_SESSION_FILE (optional, defaults to .aciq-session.json)
 */

import { loadSession, saveSession, validateSession } from "./lib/session-store.mjs";
import { scrapePortalPlaywright } from "./lib/aciq-portal-playwright.mjs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const validateOnly = args.includes("--validate-only");
const importCookieArg = args.find((a) => a.startsWith("--import-cookie"));
const importCookieValue = importCookieArg
  ? (importCookieArg.includes("=")
    ? importCookieArg.slice(importCookieArg.indexOf("=") + 1)
    : args[args.indexOf(importCookieArg) + 1])
  : null;

const log = (...m) => console.error("[session]", ...m);

async function main() {
  // Mode 1: Import a manually-obtained cookie
  if (importCookieValue) {
    log("Importing manual cookie...");

    // Parse "PHPSESSID=abc123" or "PHPSESSID=abc123; form_key=xyz"
    const cookies = {};
    for (const part of importCookieValue.split(";")) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (name) cookies[name] = value;
    }

    if (!cookies.PHPSESSID) {
      log("ERROR: No PHPSESSID found in the provided cookie string");
      log("Expected format: PHPSESSID=abc123 or PHPSESSID=abc123;form_key=xyz");
      process.exit(1);
    }

    // Validate the imported cookie
    const sessionData = {
      cookies,
      savedAt: new Date().toISOString(),
      username: process.env.ACIQ_PORTAL_USERNAME || "manual-import",
    };

    const valid = await validateSession(sessionData, { log });
    if (!valid) {
      log("ERROR: The imported cookie is not valid (session may have already expired)");
      process.exit(1);
    }

    saveSession(cookies, {
      username: process.env.ACIQ_PORTAL_USERNAME || "manual-import",
      log,
    });
    log("SUCCESS: Manual cookie imported and validated");
    process.exit(0);
  }

  // Mode 2: Validate only
  if (validateOnly) {
    const session = loadSession({ log });
    if (!session) {
      log("No saved session found");
      process.exit(1);
    }
    const valid = await validateSession(session, { log });
    process.exit(valid ? 0 : 1);
  }

  // Mode 3: Validate existing, login if expired (or --force)
  if (!force) {
    const session = loadSession({ log });
    if (session) {
      const valid = await validateSession(session, { log });
      if (valid) {
        log("Existing session is still valid — no refresh needed");
        process.exit(0);
      }
      log("Existing session expired — will attempt fresh login");
    }
  } else {
    log("--force: skipping validation, performing fresh login");
  }

  // Attempt fresh login via 2Captcha
  const username = process.env.ACIQ_PORTAL_USERNAME;
  const password = process.env.ACIQ_PORTAL_PASSWORD;

  if (!username || !password) {
    log("ERROR: ACIQ_PORTAL_USERNAME and ACIQ_PORTAL_PASSWORD must be set for automated login");
    log("Alternative: use --import-cookie to manually provide a session cookie");
    process.exit(1);
  }

  if (!process.env.TWOCAPTCHA_API_KEY) {
    log("ERROR: TWOCAPTCHA_API_KEY must be set for automated CAPTCHA solving");
    log("Alternative: use --import-cookie to manually provide a session cookie");
    process.exit(1);
  }

  log("Attempting fresh login via 2Captcha...");
  try {
    const { jar } = await scrapePortalPlaywright(username, password, { log });

    // scrapePortalPlaywright returns { jar, entries } — we only need the jar
    // Save the session cookies
    saveSession(jar.cookies, { username, log });
    log("SUCCESS: Fresh session obtained and saved");
    process.exit(0);
  } catch (err) {
    log(`FAILED: ${err.message}`);
    log("");
    log("=== MANUAL FALLBACK ===");
    log("1. Open https://portal.aciq.com/customer/account/login/ in your browser");
    log("2. Log in manually (solve the CAPTCHA yourself)");
    log("3. Open DevTools → Application → Cookies → portal.aciq.com");
    log("4. Copy the PHPSESSID value");
    log("5. Run: node refresh-aciq-session.mjs --import-cookie PHPSESSID=<value>");
    log("");
    process.exit(1);
  }
}

main();
