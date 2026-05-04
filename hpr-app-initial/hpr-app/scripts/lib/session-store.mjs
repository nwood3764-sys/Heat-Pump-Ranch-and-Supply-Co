/**
 * Portal session persistence layer.
 *
 * Saves and restores authenticated session cookies to/from a JSON file
 * so that nightly sync runs can reuse a valid session without solving
 * CAPTCHA every time.
 *
 * Storage locations (checked in order):
 *   1. ACIQ_SESSION_FILE env var (explicit path)
 *   2. .aciq-session.json in the scripts/ directory (default)
 *
 * File format:
 *   {
 *     "cookies": { "PHPSESSID": "abc123", "form_key": "xyz" },
 *     "savedAt": "2026-05-04T12:00:00Z",
 *     "expiresAt": "2026-05-11T12:00:00Z",
 *     "username": "nicholas.wood@heatpumpranch.com"
 *   }
 *
 * Session validation:
 *   GET /customer/account/ with saved cookies.
 *   If we get a 200 with "Sign Out" or "My Account" in the body,
 *   the session is still alive. Otherwise it's expired.
 *
 * Typical Magento PHPSESSID lifetime: 1-7 days depending on server
 * config. We default to 7 days max age but validate on every use.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SESSION_PATH = join(__dirname, "..", ".aciq-session.json");
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const BASE = "https://portal.aciq.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function getSessionPath() {
  return process.env.ACIQ_SESSION_FILE || DEFAULT_SESSION_PATH;
}

/**
 * Load a saved session from disk.
 * Returns null if no session file exists, or if the session is too old.
 */
export function loadSession({ log = () => {} } = {}) {
  const path = getSessionPath();
  if (!existsSync(path)) {
    log("session: no saved session file found");
    return null;
  }

  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    const savedAt = new Date(data.savedAt);
    const age = Date.now() - savedAt.getTime();

    if (age > MAX_AGE_MS) {
      log(`session: saved session is ${(age / 86400000).toFixed(1)} days old — too old, discarding`);
      return null;
    }

    if (!data.cookies || !data.cookies.PHPSESSID) {
      log("session: saved session has no PHPSESSID cookie — discarding");
      return null;
    }

    log(`session: loaded saved session (age: ${(age / 3600000).toFixed(1)}h, user: ${data.username || "unknown"})`);
    return data;
  } catch (err) {
    log(`session: failed to read session file: ${err.message}`);
    return null;
  }
}

/**
 * Save a session to disk.
 * @param {Map|Object} cookies - Cookie name→value pairs (Map or plain object)
 * @param {string} [username] - The username used to login
 */
export function saveSession(cookies, { username = null, log = () => {} } = {}) {
  const path = getSessionPath();
  const cookieObj = cookies instanceof Map
    ? Object.fromEntries(cookies)
    : cookies;

  const data = {
    cookies: cookieObj,
    savedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + MAX_AGE_MS).toISOString(),
    username,
  };

  try {
    writeFileSync(path, JSON.stringify(data, null, 2));
    log(`session: saved session to ${path} (${Object.keys(cookieObj).length} cookies)`);
  } catch (err) {
    log(`session: WARNING — failed to save session: ${err.message}`);
  }
}

/**
 * Validate a saved session by hitting the portal account page.
 * Returns true if the session is still authenticated.
 */
export async function validateSession(sessionData, { log = () => {} } = {}) {
  if (!sessionData?.cookies?.PHPSESSID) {
    log("session: no PHPSESSID to validate");
    return false;
  }

  const cookieHeader = Object.entries(sessionData.cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  try {
    log("session: validating saved session against portal...");
    const res = await fetch(`${BASE}/customer/account/`, {
      headers: {
        "Cookie": cookieHeader,
        "User-Agent": UA,
      },
      redirect: "manual",
    });

    // If we get redirected to login, session is dead
    const location = res.headers.get("location") ?? "";
    if (res.status === 302 && location.includes("login")) {
      log("session: saved session EXPIRED (redirected to login)");
      return false;
    }

    // Check the response body for auth markers
    const body = await res.text();
    const authMarkers = [
      /customer\/account\/logout/i,
      /\bSign Out\b/i,
      /\bLog ?Out\b/i,
      /\bMy Account\b/i,
      /Welcome,\s*[A-Z]/,
    ];

    const matched = authMarkers.find((re) => re.test(body));
    if (matched) {
      log(`session: saved session is VALID (matched: ${matched.source})`);
      return true;
    }

    log("session: saved session appears INVALID (no auth markers in response)");
    return false;
  } catch (err) {
    log(`session: validation request failed: ${err.message}`);
    return false;
  }
}

/**
 * Build a CookieJar-compatible object from saved session data.
 * Returns an object with toHeader() and cookies Map for compatibility
 * with the existing aciq-portal-playwright.mjs CookieJar interface.
 */
export function sessionToJar(sessionData) {
  const cookies = new Map(Object.entries(sessionData.cookies));
  return {
    cookies,
    toHeader() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    has(name) {
      return cookies.has(name);
    },
    size() {
      return cookies.size;
    },
    // Allow ingesting new cookies from responses (for compatibility)
    ingest(res) {
      const headers = typeof res?.headers?.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : (res?.headers?.raw?.()?.["set-cookie"] ?? []);
      for (const sc of headers) {
        const first = sc.split(";")[0];
        const eq = first.indexOf("=");
        if (eq < 0) continue;
        cookies.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
      }
    },
  };
}
