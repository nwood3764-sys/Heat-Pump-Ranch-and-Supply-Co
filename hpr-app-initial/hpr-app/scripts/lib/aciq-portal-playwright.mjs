/**
 * ACiQ portal login via Playwright + 2Captcha.
 *
 * This module provides a headless-browser login path for portal.aciq.com
 * when the login page has reCAPTCHA protection. The flow:
 *
 *   1. Launch Playwright Chromium, navigate to login page
 *   2. Detect reCAPTCHA site key from the page
 *   3. Send to 2Captcha API for solving (~15-45s, $0.003/solve)
 *   4. Inject the solved token into the page's g-recaptcha-response textarea
 *   5. Submit the login form
 *   6. Extract session cookies and return a CookieJar compatible with
 *      the existing fetch-based portal scraper
 *
 * Falls back to standard form submission if no CAPTCHA is detected.
 *
 * Required env:
 *   ACIQ_PORTAL_USERNAME / ACIQ_PORTAL_PASSWORD
 *   TWOCAPTCHA_API_KEY (only if CAPTCHA is present)
 */

import { chromium } from "playwright";
import { solveRecaptchaV2, solveRecaptchaV3, extractRecaptchaSiteKey } from "./captcha-solver.mjs";

const BASE = "https://portal.aciq.com";

/**
 * Minimal cookie jar compatible with the existing aciq-portal.mjs fetch helpers.
 */
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  ingest(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const sc of list) {
      const first = sc.split(";")[0];
      const eq = first.indexOf("=");
      if (eq < 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }
  toHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  has(name) {
    return this.cookies.has(name);
  }
}

/**
 * Login to the ACIQ portal using Playwright with 2Captcha support.
 * Returns a CookieJar that can be used with the existing fetch-based
 * portal scraping functions.
 *
 * @param {string} username
 * @param {string} password
 * @param {object} [opts]
 * @param {function} [opts.log]
 * @returns {Promise<CookieJar>}
 */
export async function loginWithPlaywright(username, password, { log = () => {} } = {}) {
  if (!username || !password) {
    throw new Error("loginWithPlaywright requires username and password");
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // Navigate to login page
    log("portal-pw: navigating to login page");
    await page.goto(`${BASE}/customer/account/login/`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

    // Check for reCAPTCHA
    const pageContent = await page.content();
    const hasCaptcha = await page.evaluate(() => {
      return !!(
        document.querySelector('script[src*="recaptcha"]') ||
        document.querySelector('script[src*="hcaptcha"]') ||
        document.querySelector("div.g-recaptcha") ||
        document.querySelector("[class*=captcha]") ||
        document.querySelector('input[name*="captcha"]') ||
        document.querySelector('textarea[name="g-recaptcha-response"]')
      );
    });

    let captchaToken = null;

    if (hasCaptcha) {
      log("portal-pw: reCAPTCHA detected, solving via 2Captcha...");

      // Extract site key
      const siteKey = extractRecaptchaSiteKey(pageContent);
      if (!siteKey) {
        // Try to get it from the page dynamically
        const dynamicKey = await page.evaluate(() => {
          const el = document.querySelector("div.g-recaptcha");
          return el?.getAttribute("data-sitekey") ?? null;
        });
        if (!dynamicKey) {
          throw new Error("reCAPTCHA detected but could not extract site key");
        }
        captchaToken = await solveRecaptchaV2(dynamicKey, `${BASE}/customer/account/login/`, { log });
      } else {
        // Determine if v2 or v3
        const isV3 = pageContent.includes("recaptcha/api.js?render=") &&
                     !pageContent.includes('class="g-recaptcha"');

        if (isV3) {
          captchaToken = await solveRecaptchaV3(siteKey, `${BASE}/customer/account/login/`, {
            action: "login",
            log,
          });
        } else {
          captchaToken = await solveRecaptchaV2(siteKey, `${BASE}/customer/account/login/`, { log });
        }
      }

      log(`portal-pw: CAPTCHA solved (token length=${captchaToken.length})`);

      // Inject the token into the page
      await page.evaluate((token) => {
        // Set the textarea that reCAPTCHA uses
        const textarea = document.querySelector('textarea[name="g-recaptcha-response"]');
        if (textarea) {
          textarea.value = token;
          textarea.style.display = "block"; // Some forms check visibility
        }
        // Also try setting via the grecaptcha callback if available
        if (window.grecaptcha && window.grecaptcha.getResponse) {
          // Override getResponse to return our token
          window.grecaptcha.getResponse = () => token;
        }
        // Set any hidden input fields for recaptcha
        const hiddenInputs = document.querySelectorAll('input[name*="recaptcha"], input[name*="captcha"]');
        hiddenInputs.forEach((input) => { input.value = token; });
      }, captchaToken);
    } else {
      log("portal-pw: no CAPTCHA detected, proceeding with standard login");
    }

    // Fill login form
    log("portal-pw: filling login form");
    const emailSelector = '#email, input[name="login[username]"], input[type="email"]';
    const passSelector = '#pass, input[name="login[password]"], input[type="password"]';

    await page.waitForSelector(emailSelector, { timeout: 10_000 });
    await page.fill(emailSelector, username);
    await page.fill(passSelector, password);

    // If we have a captcha token, also set it via form data before submit
    if (captchaToken) {
      await page.evaluate((token) => {
        // Ensure the recaptcha response is in all possible locations
        const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
        textareas.forEach((ta) => { ta.value = token; });

        // Some Magento themes use a hidden input
        const form = document.querySelector('form[action*="loginPost"], #login-form');
        if (form && !form.querySelector('input[name="g-recaptcha-response"]')) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "g-recaptcha-response";
          input.value = token;
          form.appendChild(input);
        }
      }, captchaToken);
    }

    // Submit the form
    log("portal-pw: submitting login form");
    const submitSelector = 'button[type="submit"]#send2, button.action.login, button[type="submit"]';

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {}),
      page.click(submitSelector),
    ]);

    // Wait for page to settle
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // Verify login success
    const finalUrl = page.url();
    const finalContent = await page.content();

    const successMarkers = [
      /customer\/account\/logout/i,
      /\bMy Account\b/i,
      /\bSign Out\b/i,
      /\bLog ?Out\b/i,
      /Welcome,\s*[A-Z]/,
      /\bAccount Dashboard\b/i,
    ];

    const matched = successMarkers.find((re) => re.test(finalContent));
    if (!matched) {
      // Check if still on login page
      const stillOnLogin = finalUrl.includes("/customer/account/login");
      const errorText = await page.evaluate(() => {
        const el = document.querySelector(".message-error, .messages .error, .message.error");
        return el?.textContent?.trim() ?? null;
      });

      throw new Error(
        `Playwright login failed. ` +
        `Still on login: ${stillOnLogin}. ` +
        `URL: ${finalUrl}. ` +
        `Error: ${errorText || "none"}. ` +
        `CAPTCHA was ${hasCaptcha ? "solved" : "not present"}.`
      );
    }

    log(`portal-pw: login successful (matched: ${matched.source})`);

    // Extract cookies into a CookieJar
    const jar = new CookieJar();
    const cookies = await context.cookies();
    for (const cookie of cookies) {
      if (cookie.domain.includes("portal.aciq.com") || cookie.domain.includes(".aciq.com")) {
        jar.cookies.set(cookie.name, cookie.value);
      }
    }

    log(`portal-pw: extracted ${jar.cookies.size} session cookies: [${[...jar.cookies.keys()].join(",")}]`);

    if (jar.cookies.size === 0) {
      throw new Error("Login appeared successful but no cookies were captured");
    }

    return jar;
  } finally {
    await browser.close();
  }
}
