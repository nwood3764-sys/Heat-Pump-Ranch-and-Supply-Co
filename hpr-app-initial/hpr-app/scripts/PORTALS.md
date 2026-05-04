# HPR Supplier Portal Reference

This document captures the exact details of each supplier portal used by the nightly sync scripts. It exists to prevent knowledge loss between development sessions.

---

## ACiQ Portal

| Field | Value |
|-------|-------|
| URL | `https://portal.aciq.com` |
| Login page | `/customer/account/login/` |
| Platform | Magento 2 |
| CAPTCHA | Invisible reCAPTCHA v2 (site key: `6LdjQEcpAAAAAKMZu6LAY9eAHLZQl-xZdLXvTz96`) |
| Username field | `input[name="login[username]"]` |
| Password field | `input[name="login[password]"]` |
| Submit button | `button#send2` or `button[type="submit"]` |
| Credentials env | `ACIQ_PORTAL_USERNAME` / `ACIQ_PORTAL_PASSWORD` |
| Credentials | `nicholas.wood@heatpumpranch.com` / (in GitHub Secrets) |

The CAPTCHA site key is embedded in a Magento JSON config block (`x-magento-init` script tag), not in a standard `data-sitekey` attribute. The captcha-solver.mjs handles extraction from both formats.

---

## LG HVAC Pro Portal (Dealer Pricing)

| Field | Value |
|-------|-------|
| URL | `https://www.lghvacpro.com/professional` |
| Login page | `/professional/s/login/` |
| Price List page | `/professional/s/price-list` |
| Platform | Salesforce Community (Lightning Web Components / Aura) |
| CAPTCHA | None |
| Username field | `input[placeholder="Username"]` (Shadow DOM / LWC) |
| Password field | `input[placeholder="Password"]` (Shadow DOM / LWC) |
| Submit button | `button` with text "Log in" (LWC, may not respond to standard click) |
| Credentials env | `LG_PORTAL_USERNAME` / `LG_PORTAL_PASSWORD` |
| Credentials | `nicholas.wood@lighthousebees.com` / (in GitHub Secrets) |
| Account name | LIGHTHOUSE BAY FOODS, INC. |
| Dealer discount | 30.00% |

### LG Portal Login Notes

The login form is a Salesforce Lightning Web Component (Aura framework). Standard Playwright `fill()` + `click()` on the "Log in" button **does not work** because LWC data binding doesn't detect programmatic value changes.

**What DOES NOT work:**
- `page.fill()` + click — LWC doesn't detect the value change
- Direct POST to `/professional/s/login/` with `un`/`pw` params — returns to login page
- `page.press('Enter')` on password field — no effect

**What WORKS (implemented in sync-lg.mjs lines 320-338):**
- Use `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` (native setter)
- Call the native setter on each input, then dispatch `input` + `change` events with `{ bubbles: true }`
- Wait 200ms for LWC to process the binding
- Then click the "Log in" button
- Wait for URL to change away from `/login`

### LG Price List Excel Format

The "Excel Download" button on the price list page downloads a file named `PriceList_YYYY-MM-DD.xlsx` with this structure:

| Column | Header | Example |
|--------|--------|---------|
| A | Product Name | `ABDAMA0` (this is the model number) |
| B | Model Type | `Product` |
| C | Description | `Vertical Installation Conversion Kit...` |
| D | Submittal Link | `Download` |
| E | List Price | `118` (numeric, no $ sign) |
| F | Applied DC(%) | `0.3` (decimal, meaning 30%) |
| G | Sales Price | `82.6` (dealer cost = List Price × 0.70) |

The file contains 756 products (as of May 2026). Sheet name is "Sheet1".

---

## LG HVAC Public Site (Product Catalog)

| Field | Value |
|-------|-------|
| URL | `https://lghvac.com` |
| Product types page | `/residential-light-commercial` |
| Product type detail | `/residential-light-commercial/product-type/?productTypeId={id}&iscommercial=false&class={class}` |
| Login required | No |

### Product Type IDs (as of May 2026)

The `productTypeId` parameter uses underscore-separated lowercase names:

```
artcool_premier, artcool_mirror, artcool_deluxe, mega,
low_wall_console, gas_furnace, multiposition_air_handler,
low_static, inverter_heat_pump_water_heater,
multi_v_s_outdoor, multi_v_s_indoor, multi_v_5_outdoor,
multi_v_5_indoor, multi_v_water_5, doas, hydro_kit, controller
```

Product pages show a models table with model numbers. Detail pages are at `/residential-light-commercial/product-detail/?modelId={model}`.

---

## Pricing Formula (HPR Business Logic)

```
Dealer Cost = LG List Price × 0.70  (from portal Excel "Sales Price" column)
HPR Retail Price = Dealer Cost × 1.20  (20% markup)
Strikethrough Price = LG List Price  (shown as "HVAC Direct" comparison)
```

---

## Important: Do NOT use these URLs

| Wrong URL | Correct URL |
|-----------|-------------|
| `us.lgsalesportal.com` | `www.lghvacpro.com/professional` |
| `lgprodealerportal.com` | `www.lghvacpro.com/professional` |
| `partner.lge.com` | `www.lghvacpro.com/professional` |

The LG dealer portal is **only** at `www.lghvacpro.com/professional`. There is no other LG portal for HPR.
