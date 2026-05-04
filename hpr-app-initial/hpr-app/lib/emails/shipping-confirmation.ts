/**
 * Shipping Confirmation Email Template
 *
 * Sent to the customer when the order is marked as shipped.
 * Includes: tracking number, carrier, items shipped, and magic links for
 * viewing order status, reporting damage/requesting return, and creating an account.
 */

import type { OrderItem, ShippingAddress } from "@/lib/orders";

interface ShippingConfirmationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  trackingNumber: string;
  carrier: string;
  orderToken: string;
  siteUrl: string;
}

/**
 * Get the tracking URL for a given carrier and tracking number.
 */
function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const c = carrier.toLowerCase();
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  if (c.includes("freight") || c.includes("estes")) return `https://www.estes-express.com/myestes/shipment-tracking/?query=${trackingNumber}`;
  if (c.includes("xpo") || c.includes("ltl")) return `https://track.xpo.com/${trackingNumber}`;
  if (c.includes("old dominion") || c.includes("odfl")) return `https://www.odfl.com/Trace/standardResult.faces?pro=${trackingNumber}`;
  // Default: Google search for tracking
  return `https://www.google.com/search?q=${encodeURIComponent(carrier + " tracking " + trackingNumber)}`;
}

export function buildShippingConfirmationEmail(data: ShippingConfirmationData): {
  subject: string;
  htmlBody: string;
} {
  const {
    orderId,
    customerName,
    items,
    shippingAddress,
    trackingNumber,
    carrier,
    orderToken,
    siteUrl,
  } = data;

  const orderUrl = `${siteUrl}/order/${orderToken}`;
  const returnUrl = `${siteUrl}/order/${orderToken}/return`;
  const createAccountUrl = `${siteUrl}/order/${orderToken}/create-account`;
  const trackingUrl = getTrackingUrl(carrier, trackingNumber);

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 14px;">
          <strong>${item.name}</strong>
          ${item.sku ? `<br><span style="color: #666; font-size: 12px;">SKU: ${item.sku}</span>` : ""}
        </td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 14px;">${item.quantity}</td>
      </tr>`,
    )
    .join("");

  const shippingHtml = shippingAddress
    ? `
      <p style="margin: 0; font-size: 14px; line-height: 1.6;">
        ${shippingAddress.name ? `<strong>${shippingAddress.name}</strong><br>` : ""}
        ${shippingAddress.line1 ?? ""}${shippingAddress.line2 ? `<br>${shippingAddress.line2}` : ""}<br>
        ${shippingAddress.city ?? ""}, ${shippingAddress.state ?? ""} ${shippingAddress.postal_code ?? ""}
      </p>
    `
    : "";

  const subject = `Your Order Has Shipped — #${orderId}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: #1a5632; padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">The Heat Pump Ranch & Supply Co.</h1>
    </div>

    <!-- Body -->
    <div style="padding: 32px 24px;">
      <h2 style="color: #1a5632; margin: 0 0 8px 0; font-size: 24px;">Your Order Has Shipped!</h2>
      <p style="color: #666; margin: 0 0 24px 0; font-size: 15px;">
        Hi ${customerName}, great news — your order is on its way.
      </p>

      <!-- Tracking Box -->
      <div style="background: #e8f5e9; border: 2px solid #1a5632; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666;">Tracking Number</p>
        <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; font-family: monospace; color: #1a5632;">${trackingNumber}</p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #666;">Carrier: <strong>${carrier}</strong></p>
        <a href="${trackingUrl}" style="display: inline-block; background: #1a5632; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
          Track Your Shipment
        </a>
      </div>

      <!-- Order Info -->
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="color: #666; padding: 4px 0;">Order Number:</td>
            <td style="font-weight: bold; text-align: right;">${orderId}</td>
          </tr>
        </table>
      </div>

      <!-- Shipping Address -->
      ${shippingAddress ? `
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="color: #333; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Delivering To</h3>
        ${shippingHtml}
      </div>
      ` : ""}

      <!-- Items Shipped -->
      <h3 style="color: #333; margin: 24px 0 12px 0; font-size: 16px;">Items Shipped</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #1a5632;">
            <th style="padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666;">Item</th>
            <th style="padding: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #666;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Action Links -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
        <h3 style="color: #333; margin: 0 0 12px 0; font-size: 14px;">Need Help With Your Order?</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0;">
              <a href="${orderUrl}" style="color: #1a5632; text-decoration: underline; font-weight: 500;">View Order Details</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <a href="${returnUrl}" style="color: #1a5632; text-decoration: underline; font-weight: 500;">Report Damage or Request a Return</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <a href="${createAccountUrl}" style="color: #1a5632; text-decoration: underline; font-weight: 500;">Create an Account</a>
              <span style="color: #999; font-size: 12px;"> — manage orders, track shipments, reorder</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Delivery Tips -->
      <div style="background: #fff8e1; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #333;">Delivery Tips</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #666; line-height: 1.8;">
          <li>Inspect all packages for visible damage before signing</li>
          <li>Note any damage on the delivery receipt</li>
          <li>Take photos of any damage immediately</li>
          <li>Contact us within 48 hours to report damage</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
        Questions? Reply to this email or call us at 608-830-9224.
      </p>
      <p style="margin: 0; font-size: 12px; color: #999;">
        The Heat Pump Ranch & Supply Co. | orders@heatpumpranch.com
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, htmlBody };
}
