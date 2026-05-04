import { NextResponse, type NextRequest } from "next/server";
import { getOrderByToken } from "@/lib/order-tokens";
import { sendEmail } from "@/lib/microsoft-graph";

/**
 * POST /api/orders/return
 *
 * Submit a return/damage request for an order.
 * Authenticated via the order token (magic link).
 *
 * Body: {
 *   orderToken: string;
 *   reason: "damaged" | "wrong_item" | "not_needed" | "other";
 *   description: string;
 *   photos?: string[]; // URLs to uploaded photos (future)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderToken, reason, description } = body;

    if (!orderToken || !reason || !description) {
      return NextResponse.json(
        { error: "orderToken, reason, and description are required" },
        { status: 400 },
      );
    }

    const validReasons = ["damaged", "wrong_item", "not_needed", "other"];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `reason must be one of: ${validReasons.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate the order token
    const order = await getOrderByToken(orderToken);
    if (!order) {
      return NextResponse.json({ error: "Invalid or expired order link" }, { status: 404 });
    }

    const reasonLabels: Record<string, string> = {
      damaged: "Received Damaged",
      wrong_item: "Wrong Item Received",
      not_needed: "No Longer Needed",
      other: "Other",
    };

    // Send notification email to store owner
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Return / Damage Request</h1>
        </div>
        <div style="padding: 24px; background: #f9f9f9;">
          <h2 style="margin: 0 0 16px 0;">Order #${order.order_id}</h2>
          
          <table style="width: 100%; font-size: 14px; margin-bottom: 16px;">
            <tr>
              <td style="color: #666; padding: 4px 0;">Customer:</td>
              <td style="font-weight: bold;">${order.customer_name}</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 4px 0;">Email:</td>
              <td><a href="mailto:${order.customer_email}">${order.customer_email}</a></td>
            </tr>
            <tr>
              <td style="color: #666; padding: 4px 0;">Reason:</td>
              <td style="font-weight: bold; color: #dc2626;">${reasonLabels[reason]}</td>
            </tr>
          </table>

          <h3 style="margin: 16px 0 8px 0;">Customer's Description:</h3>
          <div style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 16px; font-size: 14px; white-space: pre-wrap;">${description}</div>

          <h3 style="margin: 16px 0 8px 0;">Items in Order:</h3>
          <ul style="font-size: 14px; padding-left: 20px;">
            ${(order.items as any[]).map((item: any) => `<li>${item.name} (Qty: ${item.quantity})</li>`).join("")}
          </ul>

          ${order.tracking_number ? `<p style="font-size: 13px; color: #666;">Tracking: ${order.tracking_number}</p>` : ""}
        </div>
        <div style="padding: 16px; background: #e5e7eb; text-align: center; font-size: 12px; color: #666;">
          <p>Reply to the customer at <a href="mailto:${order.customer_email}">${order.customer_email}</a></p>
        </div>
      </div>
    `;

    await sendEmail({
      to: ["orders@heatpumpranch.com"],
      subject: `Return Request — Order #${order.order_id} — ${reasonLabels[reason]}`,
      htmlBody,
    });

    // Send confirmation to customer
    await sendEmail({
      to: [order.customer_email],
      subject: `Return Request Received — Order #${order.order_id}`,
      htmlBody: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a5632; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">The Heat Pump Ranch & Supply Co.</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="color: #333; margin: 0 0 12px 0;">Return Request Received</h2>
            <p style="color: #666; font-size: 15px;">
              Hi ${order.customer_name}, we've received your return request for order <strong>#${order.order_id}</strong>.
            </p>
            <p style="color: #666; font-size: 15px;">
              Our team will review your request and get back to you within 1-2 business days with next steps.
            </p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <p style="margin: 0; font-size: 14px;"><strong>Reason:</strong> ${reasonLabels[reason]}</p>
              <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Your note:</strong> ${description}</p>
            </div>
            <p style="color: #666; font-size: 13px; margin-top: 24px;">
              If you have photos of any damage, please reply to this email with them attached.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 12px; color: #999;">608-830-9224 | orders@heatpumpranch.com</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "Return request submitted" });
  } catch (err: any) {
    console.error("[Return Request] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
