/**
 * Payment Confirmed Email — sent to customer when ACH bank transfer clears (2-4 days after checkout).
 */

interface PaymentConfirmedEmailParams {
  orderId: string;
  customerName: string;
  amountTotalCents: number;
  items: Array<{ name: string; quantity: number; unit_price_cents: number }>;
  orderToken: string;
  siteUrl: string;
}

export function buildPaymentConfirmedEmail(params: PaymentConfirmedEmailParams) {
  const { orderId, customerName, amountTotalCents, items, orderToken, siteUrl } = params;

  const total = (amountTotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const orderUrl = `${siteUrl}/order/${orderToken}`;

  const subject = `Payment Confirmed — Order #${orderId}`;

  const itemRows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px;">${item.name}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; text-align: right;">$${((item.unit_price_cents * item.quantity) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        </tr>`
    )
    .join("");

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background-color: #16a34a; border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Payment Confirmed</h1>
      <p style="color: #bbf7d0; margin: 8px 0 0; font-size: 14px;">Your bank transfer has been verified</p>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e4e4e7; border-top: none;">
      <p style="font-size: 16px; color: #18181b; margin: 0 0 16px;">Hi ${customerName},</p>
      
      <p style="font-size: 14px; color: #3f3f46; line-height: 1.6; margin: 0 0 24px;">
        Great news — your ACH bank transfer for <strong>Order #${orderId}</strong> has been successfully processed. 
        Your order is now being prepared for shipment.
      </p>

      <!-- Amount Badge -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center; margin: 0 0 24px;">
        <p style="margin: 0; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Amount Charged</p>
        <p style="margin: 4px 0 0; font-size: 28px; font-weight: 700; color: #16a34a;">$${total}</p>
      </div>

      <!-- Items -->
      <h3 style="font-size: 14px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Items in Your Order</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #e4e4e7; font-size: 12px; color: #71717a;">Item</th>
            <th style="text-align: center; padding: 8px 0; border-bottom: 2px solid #e4e4e7; font-size: 12px; color: #71717a;">Qty</th>
            <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #e4e4e7; font-size: 12px; color: #71717a;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- What's Next -->
      <div style="background-color: #fafafa; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
        <h3 style="font-size: 14px; font-weight: 600; color: #18181b; margin: 0 0 8px;">What Happens Next?</h3>
        <p style="font-size: 13px; color: #3f3f46; line-height: 1.6; margin: 0;">
          We're preparing your order for shipment. You'll receive another email with tracking information once your order ships. 
          Most orders ship within 1-3 business days.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${orderUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          View Order Status
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 20px; margin-top: 24px;">
        <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">
          Questions? Call us at <a href="tel:+16088309224" style="color: #18181b;">608-830-9224</a> or email 
          <a href="mailto:orders@heatpumpranch.com" style="color: #18181b;">orders@heatpumpranch.com</a>
        </p>
        <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin: 12px 0 0;">
          The Heat Pump Ranch & Supply Co.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, htmlBody };
}
