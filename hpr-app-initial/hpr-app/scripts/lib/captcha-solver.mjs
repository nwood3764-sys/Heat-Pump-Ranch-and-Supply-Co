/**
 * 2Captcha reCAPTCHA solver integration.
 *
 * Used by the ACIQ portal login when reCAPTCHA is detected on the
 * Magento login page. Sends the site key and page URL to 2Captcha's
 * API, polls for the solution token, and returns it for injection
 * into the login form.
 *
 * Cost: ~$0.003 per solve (reCAPTCHA v2).
 *
 * Required env:
 *   TWOCAPTCHA_API_KEY — your 2captcha.com API key
 *
 * Flow:
 *   1. Extract the reCAPTCHA site key from the login page HTML
 *   2. Submit to 2Captcha: POST /in.php with method=userrecaptcha
 *   3. Poll GET /res.php until solution is ready (typically 15-45s)
 *   4. Return the g-recaptcha-response token
 */

const TWOCAPTCHA_BASE = "https://2captcha.com";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 5 min max wait

/**
 * Solve a reCAPTCHA v2 challenge via 2Captcha.
 * @param {string} siteKey - The reCAPTCHA site key (data-sitekey attribute)
 * @param {string} pageUrl - The URL where the CAPTCHA appears
 * @param {object} [opts]
 * @param {function} [opts.log] - Logging function
 * @returns {Promise<string>} The g-recaptcha-response token
 */
export async function solveRecaptchaV2(siteKey, pageUrl, { log = () => {} } = {}) {
  const apiKey = process.env.TWOCAPTCHA_API_KEY;
  if (!apiKey) {
    throw new Error("TWOCAPTCHA_API_KEY env var is required for CAPTCHA solving");
  }

  log(`captcha: submitting reCAPTCHA v2 solve request (siteKey=${siteKey.slice(0, 20)}...)`);

  // Step 1: Submit the CAPTCHA task
  const submitUrl = new URL("/in.php", TWOCAPTCHA_BASE);
  submitUrl.searchParams.set("key", apiKey);
  submitUrl.searchParams.set("method", "userrecaptcha");
  submitUrl.searchParams.set("googlekey", siteKey);
  submitUrl.searchParams.set("pageurl", pageUrl);
  submitUrl.searchParams.set("json", "1");

  const submitRes = await fetch(submitUrl.toString(), { method: "POST" });
  const submitData = await submitRes.json();

  if (submitData.status !== 1) {
    throw new Error(`2Captcha submit failed: ${submitData.request || JSON.stringify(submitData)}`);
  }

  const taskId = submitData.request;
  log(`captcha: task submitted (id=${taskId}), polling for solution...`);

  // Step 2: Poll for solution
  const resultUrl = new URL("/res.php", TWOCAPTCHA_BASE);
  resultUrl.searchParams.set("key", apiKey);
  resultUrl.searchParams.set("action", "get");
  resultUrl.searchParams.set("id", taskId);
  resultUrl.searchParams.set("json", "1");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(resultUrl.toString());
    const pollData = await pollRes.json();

    if (pollData.status === 1) {
      log(`captcha: solved in ${(attempt + 1) * POLL_INTERVAL_MS / 1000}s`);
      return pollData.request; // The g-recaptcha-response token
    }

    if (pollData.request === "CAPCHA_NOT_READY") {
      if (attempt % 4 === 0) {
        log(`captcha: still solving... (${(attempt + 1) * POLL_INTERVAL_MS / 1000}s elapsed)`);
      }
      continue;
    }

    // Any other response is an error
    throw new Error(`2Captcha poll error: ${pollData.request || JSON.stringify(pollData)}`);
  }

  throw new Error(`2Captcha timeout: solution not ready after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

/**
 * Extract the reCAPTCHA site key from page HTML.
 * Looks for data-sitekey attribute or the render parameter in the script URL.
 * @param {string} html - The page HTML
 * @returns {string|null} The site key or null if not found
 */
export function extractRecaptchaSiteKey(html) {
  // Method 1: data-sitekey attribute on the reCAPTCHA div
  const siteKeyMatch = html.match(/data-sitekey=["']([^"']+)["']/);
  if (siteKeyMatch) return siteKeyMatch[1];

  // Method 2: grecaptcha.render() call with sitekey parameter
  const renderMatch = html.match(/sitekey['":\s]+['"]([A-Za-z0-9_-]{40})['"]/);
  if (renderMatch) return renderMatch[1];

  // Method 3: In the recaptcha script URL as render= parameter
  const scriptMatch = html.match(/recaptcha\/(?:api|enterprise)\.js\?[^"']*render=([A-Za-z0-9_-]{40})/);
  if (scriptMatch) return scriptMatch[1];

  return null;
}

/**
 * Solve a reCAPTCHA v3 (invisible) challenge via 2Captcha.
 * @param {string} siteKey - The reCAPTCHA site key
 * @param {string} pageUrl - The URL where the CAPTCHA appears
 * @param {object} [opts]
 * @param {string} [opts.action] - The reCAPTCHA action (e.g., "login")
 * @param {number} [opts.minScore] - Minimum score (0.1-0.9)
 * @param {function} [opts.log] - Logging function
 * @returns {Promise<string>} The g-recaptcha-response token
 */
export async function solveRecaptchaV3(siteKey, pageUrl, { action = "login", minScore = 0.7, log = () => {} } = {}) {
  const apiKey = process.env.TWOCAPTCHA_API_KEY;
  if (!apiKey) {
    throw new Error("TWOCAPTCHA_API_KEY env var is required for CAPTCHA solving");
  }

  log(`captcha: submitting reCAPTCHA v3 solve request (action=${action})`);

  const submitUrl = new URL("/in.php", TWOCAPTCHA_BASE);
  submitUrl.searchParams.set("key", apiKey);
  submitUrl.searchParams.set("method", "userrecaptcha");
  submitUrl.searchParams.set("googlekey", siteKey);
  submitUrl.searchParams.set("pageurl", pageUrl);
  submitUrl.searchParams.set("version", "v3");
  submitUrl.searchParams.set("action", action);
  submitUrl.searchParams.set("min_score", String(minScore));
  submitUrl.searchParams.set("json", "1");

  const submitRes = await fetch(submitUrl.toString(), { method: "POST" });
  const submitData = await submitRes.json();

  if (submitData.status !== 1) {
    throw new Error(`2Captcha submit failed: ${submitData.request || JSON.stringify(submitData)}`);
  }

  const taskId = submitData.request;
  log(`captcha: v3 task submitted (id=${taskId}), polling...`);

  const resultUrl = new URL("/res.php", TWOCAPTCHA_BASE);
  resultUrl.searchParams.set("key", apiKey);
  resultUrl.searchParams.set("action", "get");
  resultUrl.searchParams.set("id", taskId);
  resultUrl.searchParams.set("json", "1");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(resultUrl.toString());
    const pollData = await pollRes.json();

    if (pollData.status === 1) {
      log(`captcha: v3 solved in ${(attempt + 1) * POLL_INTERVAL_MS / 1000}s`);
      return pollData.request;
    }

    if (pollData.request === "CAPCHA_NOT_READY") continue;
    throw new Error(`2Captcha poll error: ${pollData.request || JSON.stringify(pollData)}`);
  }

  throw new Error(`2Captcha timeout for v3`);
}
