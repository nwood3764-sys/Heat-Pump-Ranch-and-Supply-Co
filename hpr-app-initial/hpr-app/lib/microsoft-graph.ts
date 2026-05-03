/**
 * Microsoft Graph API integration for sending emails via M365.
 *
 * Uses client credentials flow (app-only, no user sign-in required).
 * Requires: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
 * The app registration must have Mail.Send application permission granted.
 */

interface EmailMessage {
  to: string[];
  subject: string;
  htmlBody: string;
  from?: string; // defaults to orders@heatpumpranchandsupplyco.com
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get an access token using client credentials flow.
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure AD credentials not configured (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Azure AD token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

/**
 * Send an email via Microsoft Graph API.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const token = await getAccessToken();
  const fromAddress = message.from ?? "orders@heatpumpranchandsupplyco.com";

  const graphPayload = {
    message: {
      subject: message.subject,
      body: {
        contentType: "HTML",
        content: message.htmlBody,
      },
      toRecipients: message.to.map((email) => ({
        emailAddress: { address: email },
      })),
    },
    saveToSentItems: true,
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${fromAddress}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphPayload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph sendMail failed: ${response.status} ${errorText}`);
  }

  console.log(`[Email] Sent "${message.subject}" to ${message.to.join(", ")}`);
}

/**
 * Format and send an order notification email.
 */
export async function sendOrderNotification(order: {
  orderId: string;
  sessionId: string;
  customerEmail: string;
  customerName: string;
  paymentMethod: "card" | "ach";
  amountTotal: number; // in cents
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number; // in cents
  }>;
  shippingAddress?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  status: "paid" | "pending" | "failed";
}): Promise<void> {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.unitPrice / 100).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${((item.unitPrice * item.quantity) / 100).toFixed(2)}</td>
      </tr>`,
    )
    .join("");

  const shippingHtml = order.shippingAddress
    ? `
      <h3 style="color: #1a5632; margin-top: 24px;">Shipping Address</h3>
      <p style="margin: 4px 0;">${order.shippingAddress.name ?? ""}</p>
      <p style="margin: 4px 0;">${order.shippingAddress.line1 ?? ""}</p>
      ${order.shippingAddress.line2 ? `<p style="margin: 4px 0;">${order.shippingAddress.line2}</p>` : ""}
      <p style="margin: 4px 0;">${order.shippingAddress.city ?? ""}, ${order.shippingAddress.state ?? ""} ${order.shippingAddress.postal_code ?? ""}</p>
      <p style="margin: 4px 0;">${order.shippingAddress.country ?? ""}</p>
    `
    : `<p style="color: #c00; margin-top: 24px;"><strong>⚠️ No shipping address collected</strong></p>`;

  const statusBadge =
    order.status === "paid"
      ? '<span style="background: #16a34a; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">PAID</span>'
      : order.status === "pending"
        ? '<span style="background: #d97706; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">PENDING (ACH)</span>'
        : '<span style="background: #dc2626; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">FAILED</span>';

  const paymentMethodLabel = order.paymentMethod === "card" ? "Credit Card" : "ACH Bank Transfer";

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a5632; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">🤠 New Order — Heat Pump Ranch</h1>
      </div>
      
      <div style="padding: 24px; background: #f9f9f9;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h2 style="margin: 0; color: #333;">Order #${order.orderId}</h2>
          ${statusBadge}
        </div>
        
        <table style="width: 100%; margin-bottom: 8px;">
          <tr>
            <td style="color: #666;">Customer:</td>
            <td style="font-weight: bold;">${order.customerName}</td>
          </tr>
          <tr>
            <td style="color: #666;">Email:</td>
            <td><a href="mailto:${order.customerEmail}">${order.customerEmail}</a></td>
          </tr>
          <tr>
            <td style="color: #666;">Payment Method:</td>
            <td>${paymentMethodLabel}</td>
          </tr>
          <tr>
            <td style="color: #666;">Stripe Session:</td>
            <td style="font-size: 12px; font-family: monospace;">${order.sessionId}</td>
          </tr>
        </table>

        <h3 style="color: #1a5632; margin-top: 24px;">Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Unit Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background: #e5e7eb;">
              <td colspan="3" style="padding: 8px; text-align: right;">Total Charged:</td>
              <td style="padding: 8px; text-align: right;">$${(order.amountTotal / 100).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        ${shippingHtml}
      </div>
      
      <div style="padding: 16px; background: #e5e7eb; text-align: center; font-size: 12px; color: #666;">
        <p>This is an automated notification from Heat Pump Ranch & Supply Co.</p>
        <p><a href="https://heatpumpranch.com/admin/orders">View All Orders →</a></p>
      </div>
    </div>
  `;

  const subject =
    order.status === "failed"
      ? `❌ PAYMENT FAILED — Order #${order.orderId}`
      : order.status === "pending"
        ? `⏳ New Order (ACH Pending) — #${order.orderId} — $${(order.amountTotal / 100).toFixed(2)}`
        : `✅ New Order PAID — #${order.orderId} — $${(order.amountTotal / 100).toFixed(2)}`;

  await sendEmail({
    to: ["orders@heatpumpranchandsupplyco.com"],
    subject,
    htmlBody: htmlBody,
  });
}
