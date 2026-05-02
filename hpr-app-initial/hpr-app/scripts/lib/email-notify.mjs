/**
 * Email notification module for nightly pricing reports.
 *
 * Sends the pricing report summary via Resend (https://resend.com)
 * after each nightly sync completes. The email includes:
 *   - Sync status (complete/partial/failed)
 *   - Summary stats (products seen, added, updated, price changes)
 *   - Full pricing report table
 *   - Any errors or warnings
 *
 * Required env:
 *   RESEND_API_KEY — Resend API key for sending emails
 *
 * Optional env:
 *   NOTIFY_EMAIL_TO — recipient email (default: nicholas.wood@heatpumpranch.com)
 *   NOTIFY_EMAIL_FROM — sender email (default: nightly@heatpumpranch.com)
 *
 * If RESEND_API_KEY is not set, the module silently skips email sending
 * (the sync still completes and logs the report to console/DB).
 */

/**
 * Send the nightly pricing report email.
 *
 * @param {object} opts
 * @param {string} opts.portal - 'aciq' | 'lg'
 * @param {string} opts.status - 'completed' | 'partial' | 'failed'
 * @param {object} opts.totals - Sync totals object
 * @param {Array} opts.pricingReport - Array of pricing detail objects
 * @param {string} [opts.errorMessage] - Error message if failed
 * @param {function} [opts.log]
 */
export async function sendPricingReportEmail({
  portal,
  status,
  totals,
  pricingReport = [],
  errorMessage = null,
  log = () => {},
} = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log("email: RESEND_API_KEY not set, skipping email notification");
    return;
  }

  const to = process.env.NOTIFY_EMAIL_TO || "nicholas.wood@heatpumpranch.com";
  const from = process.env.NOTIFY_EMAIL_FROM || "HPR Nightly Sync <nightly@heatpumpranch.com>";

  const portalName = portal.toUpperCase();
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statusEmoji = status === "completed" ? "✅" : status === "partial" ? "⚠️" : "❌";
  const subject = `${statusEmoji} ${portalName} Nightly Sync — ${date}`;

  const html = buildEmailHtml({ portal: portalName, status, totals, pricingReport, errorMessage, date });

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      log(`email: Resend error: ${error.message || JSON.stringify(error)}`);
      return;
    }

    log(`email: sent pricing report to ${to} (id=${data?.id})`);
  } catch (err) {
    log(`email: failed to send: ${err?.message ?? err}`);
    // Don't throw — email failure should not break the sync
  }
}

/**
 * Build the HTML email body.
 */
function buildEmailHtml({ portal, status, totals, pricingReport, errorMessage, date }) {
  const statusColor = status === "completed" ? "#16a34a" : status === "partial" ? "#d97706" : "#dc2626";
  const statusLabel = status === "completed" ? "Complete" : status === "partial" ? "Partial (some failures)" : "FAILED";

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid ${statusColor}; }
    .header h1 { margin: 0 0 8px 0; font-size: 20px; color: #0f172a; }
    .header .status { color: ${statusColor}; font-weight: 600; font-size: 14px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat { background: #f1f5f9; border-radius: 6px; padding: 12px; text-align: center; }
    .stat .value { font-size: 24px; font-weight: 700; color: #0f172a; }
    .stat .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 16px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
    tr:hover td { background: #f8fafc; }
    .price { font-family: 'SF Mono', Menlo, monospace; text-align: right; }
    .savings { color: #16a34a; font-weight: 600; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 16px; color: #991b1b; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${portal} Nightly Sync Report</h1>
    <div class="status">${statusLabel} — ${date}</div>
  </div>
`;

  if (errorMessage) {
    html += `
  <div class="error-box">
    <strong>Error:</strong> ${escapeHtml(errorMessage)}
  </div>
`;
  }

  html += `
  <div class="stats">
    <div class="stat"><div class="value">${totals.products_seen ?? 0}</div><div class="label">Products Seen</div></div>
    <div class="stat"><div class="value">${totals.products_added ?? 0}</div><div class="label">Added</div></div>
    <div class="stat"><div class="value">${totals.products_updated ?? 0}</div><div class="label">Updated</div></div>
    <div class="stat"><div class="value">${totals.price_changes ?? 0}</div><div class="label">Price Changes</div></div>
    <div class="stat"><div class="value">${totals.products_discontinued ?? 0}</div><div class="label">Discontinued</div></div>
    <div class="stat"><div class="value">${totals.products_failed ?? 0}</div><div class="label">Failed</div></div>
  </div>
`;

  // Pricing report table
  if (pricingReport.length > 0) {
    const withSavings = pricingReport.filter((p) => p.savings != null && p.savings > 0);
    const avgMargin = withSavings.length > 0
      ? (withSavings.reduce((sum, p) => sum + (p.marginPct ?? 0), 0) / withSavings.length).toFixed(1)
      : "N/A";

    html += `
  <h2 style="font-size: 16px; margin-bottom: 4px;">Pricing Summary</h2>
  <p style="font-size: 13px; color: #64748b; margin-top: 0;">
    ${pricingReport.length} products priced | ${withSavings.length} with savings vs competitors | Avg margin: ${avgMargin}%
  </p>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th class="price">Dealer Cost</th>
        <th class="price">Our Price</th>
        <th class="price">HVAC Direct</th>
        <th class="price">Savings</th>
        <th class="price">Margin</th>
      </tr>
    </thead>
    <tbody>
`;

    // Show up to 50 products in email (full report in DB)
    const displayProducts = pricingReport.slice(0, 50);
    for (const item of displayProducts) {
      const dealerStr = item.dealerCost != null ? `$${item.dealerCost.toFixed(2)}` : "—";
      const ourStr = item.ourPrice != null ? `$${item.ourPrice.toFixed(2)}` : "—";
      const hvacStr = item.hvacDirectPrice != null ? `$${item.hvacDirectPrice.toFixed(2)}` : "—";
      const savingsStr = item.savings != null ? `$${item.savings.toFixed(2)}` : "—";
      const marginStr = item.marginPct != null ? `${item.marginPct.toFixed(1)}%` : "—";

      html += `
      <tr>
        <td>${escapeHtml(item.sku)}</td>
        <td class="price">${dealerStr}</td>
        <td class="price">${ourStr}</td>
        <td class="price">${hvacStr}</td>
        <td class="price savings">${savingsStr}</td>
        <td class="price savings">${marginStr}</td>
      </tr>
`;
    }

    if (pricingReport.length > 50) {
      html += `
      <tr>
        <td colspan="6" style="text-align: center; color: #64748b; font-style: italic; padding: 12px;">
          ... and ${pricingReport.length - 50} more products (full report in database)
        </td>
      </tr>
`;
    }

    html += `
    </tbody>
  </table>
`;
  }

  html += `
  <div class="footer">
    <p>This is an automated report from Heat Pump Ranch nightly sync.</p>
    <p>View full details in the <a href="https://heat-pump-ranch-and-supply-co.netlify.app/admin">Admin Dashboard</a>.</p>
  </div>
</body>
</html>
`;

  return html;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
