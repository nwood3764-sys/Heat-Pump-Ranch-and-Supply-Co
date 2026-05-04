/**
 * Customer Order Confirmation Email Template
 *
 * Sent to the customer immediately after successful payment.
 * Includes: order details, items, shipping address, and magic links for
 * viewing order status, requesting a return, and creating an account.
 */

import type { OrderItem, ShippingAddress } from "@/lib/orders";

interface OrderConfirmationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: "card" | "ach";
  amountTotalCents: number;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  orderToken: string;
  siteUrl: string;
}

export function buildOrderConfirmationEmail(data: OrderConfirmationData): {
  subject: string;
  htmlBody: string;
} {
  const {
    orderId,
    customerName,
    paymentMethod,
    amountTotalCents,
    items,
    shippingAddress,
    orderToken,
    siteUrl,
  } = data;

  const orderUrl = `${siteUrl}/order/${orderToken}`;
  const returnUrl = `${siteUrl}/order/${orderToken}/return`;
  const createAccountUrl = `${siteUrl}/order/${orderToken}/create-account`;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 14px;">
          <strong>${item.name}</strong>
          ${item.sku ? `<br><span style="color: #666; font-size: 12px;">SKU: ${item.sku}</span>` : ""}
        </td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px;">$${(item.unit_price_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 14px; font-weight: bold;">$${((item.unit_price_cents * item.quantity) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>`,
    )
    .join("");

  const shippingHtml = shippingAddress
    ? `
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <h3 style="color: #1a5632; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Shipping To</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6;">
          ${shippingAddress.name ? `<strong>${shippingAddress.name}</strong><br>` : ""}
          ${shippingAddress.line1 ?? ""}${shippingAddress.line2 ? `<br>${shippingAddress.line2}` : ""}<br>
          ${shippingAddress.city ?? ""}, ${shippingAddress.state ?? ""} ${shippingAddress.postal_code ?? ""}
        </p>
      </div>
    `
    : "";

  const paymentLabel = paymentMethod === "card" ? "Credit Card" : "ACH Bank Transfer";
  const achNote =
    paymentMethod === "ach"
      ? `<p style="background: #fef3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 12px; font-size: 13px; margin-top: 16px;">
          <strong>Note:</strong> ACH payments typically take 2-4 business days to clear. 
          Your order will ship once payment is confirmed.
        </p>`
      : "";

  const subject = `Order Confirmed — #${orderId}`;

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
      <h2 style="color: #1a5632; margin: 0 0 8px 0; font-size: 24px;">Order Confirmed</h2>
      <p style="color: #666; margin: 0 0 24px 0; font-size: 15px;">
        Hi ${customerName}, thank you for your order. Here's your receipt.
      </p>

      <!-- Order Summary Box -->
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="color: #666; padding: 4px 0;">Order Number:</td>
            <td style="font-weight: bold; text-align: right;">${orderId}</td>
          </tr>
          <tr>
            <td style="color: #666; padding: 4px 0;">Payment Method:</td>
            <td style="text-align: right;">${paymentLabel}</td>
          </tr>
          <tr>
            <td style="color: #666; padding: 4px 0;">Order Total:</td>
            <td style="font-weight: bold; text-align: right; font-size: 18px; color: #1a5632;">$${(amountTotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </div>

      ${achNote}

      <!-- Items Table -->
      <h3 style="color: #333; margin: 24px 0 12px 0; font-size: 16px;">Items Ordered</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #1a5632;">
            <th style="padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666;">Item</th>
            <th style="padding: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #666;">Qty</th>
            <th style="padding: 8px; text-align: right; font-size: 12px; text-transform: uppercase; color: #666;">Price</th>
            <th style="padding: 8px; text-align: right; font-size: 12px; text-transform: uppercase; color: #666;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 15px;">Total Charged:</td>
            <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px; color: #1a5632;">$${(amountTotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>

      ${shippingHtml}

      <!-- Action Buttons -->
      <div style="margin-top: 32px; text-align: center;">
        <a href="${orderUrl}" style="display: inline-block; background: #1a5632; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; margin-bottom: 12px;">
          View Order Status
        </a>
        <p style="font-size: 13px; color: #666; margin-top: 16px;">
          <a href="${createAccountUrl}" style="color: #1a5632; text-decoration: underline;">Create an account</a> to track all your orders in one place.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
        Questions about your order? Reply to this email or call us at 608-830-9224.
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
