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

      // Extract site key from HTML (handles Magento JSON config format)
      let siteKey = extractRecaptchaSiteKey(pageContent);

      // Fallback: try to get it from the page dynamically
      if (!siteKey) {
        siteKey = await page.evaluate(() => {
          // Standard data-sitekey attribute
          const el = document.querySelector("div.g-recaptcha, [data-sitekey]");
          if (el) return el.getAttribute("data-sitekey");

          // Magento RequireJS config — look in window.mageConfig or script text
          const scripts = [...document.querySelectorAll('script[type="text/x-magento-init"]')];
          for (const s of scripts) {
            const m = s.textContent.match(/"sitekey"\s*:\s*"([A-Za-z0-9_-]{30,})"/);
            if (m) return m[1];
          }
          return null;
        });
      }

      if (!siteKey) {
        throw new Error("reCAPTCHA detected but could not extract site key");
      }

      log(`portal-pw: extracted site key: ${siteKey.slice(0, 20)}...`);

      // Determine reCAPTCHA type from the page config
      // portal.aciq.com uses invisible v2 (size="invisible")
      const isInvisibleV2 = pageContent.includes('"size":"invisible"') ||
                            pageContent.includes("size='invisible'") ||
                            pageContent.includes('data-size="invisible"');
      const isV3 = pageContent.includes("recaptcha/api.js?render=") &&
                   !pageContent.includes('class="g-recaptcha"') &&
                   !isInvisibleV2;

      if (isV3) {
        log("portal-pw: detected reCAPTCHA v3");
        captchaToken = await solveRecaptchaV3(siteKey, `${BASE}/customer/account/login/`, {
          action: "login",
          log,
        });
      } else {
        // Both standard v2 and invisible v2 use the same 2Captcha method
        log(`portal-pw: detected reCAPTCHA v2 ${isInvisibleV2 ? "(invisible)" : "(checkbox)"}`);
        captchaToken = await solveRecaptchaV2(siteKey, `${BASE}/customer/account/login/`, { log });
      }

      log(`portal-pw: CAPTCHA solved (token length=${captchaToken.length})`);

      // Inject the token into the page — handle all possible locations
      await page.evaluate((token) => {
        // Set all g-recaptcha-response textareas (Magento creates multiple)
        document.querySelectorAll('textarea[name="g-recaptcha-response"]').forEach((ta) => {
          ta.value = token;
          ta.style.display = "block";
        });

        // Also try setting via the grecaptcha callback if available
        if (window.grecaptcha) {
          if (window.grecaptcha.getResponse) {
            window.grecaptcha.getResponse = () => token;
          }
          // For invisible reCAPTCHA, trigger the callback directly
          if (window.grecaptcha.execute) {
            // Find and call the registered callback
            const callbacks = document.querySelectorAll('[data-callback]');
            callbacks.forEach((el) => {
              const cbName = el.getAttribute('data-callback');
              if (cbName && window[cbName]) window[cbName](token);
            });
          }
        }

        // Set any hidden input fields for recaptcha
        document.querySelectorAll('input[name*="recaptcha"], input[name*="captcha"]').forEach((input) => {
          input.value = token;
        });

        // Magento-specific: set the token in the form's hidden field
        const forms = document.querySelectorAll('form[action*="loginPost"], #login-form, form.form-login');
        forms.forEach((form) => {
          let input = form.querySelector('input[name="g-recaptcha-response"]');
          if (!input) {
            input = document.createElement("input");
            input.type = "hidden";
            input.name = "g-recaptcha-response";
            form.appendChild(input);
          }
          input.value = token;

          // Also add token= field that some Magento captcha modules expect
          let tokenInput = form.querySelector('input[name="token"]');
          if (!tokenInput) {
            tokenInput = document.createElement("input");
            tokenInput.type = "hidden";
            tokenInput.name = "token";
            form.appendChild(tokenInput);
          }
          tokenInput.value = token;
        });
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
