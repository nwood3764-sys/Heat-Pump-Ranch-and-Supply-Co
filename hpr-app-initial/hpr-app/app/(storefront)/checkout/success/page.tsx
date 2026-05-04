import Link from "next/link";
import { CheckCircle, Package, UserPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Order Confirmed | The Heat Pump Ranch & Supply Co.",
  description: "Your order has been placed successfully.",
};

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  // Try to look up the order by Stripe session ID
  let order: any = null;
  if (sessionId) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("orders")
      .select("order_id, customer_name, customer_email, amount_total_cents, status, payment_method, items, order_token, user_id")
      .eq("stripe_session_id", sessionId)
      .single();
    order = data;
  }

  const isACH = order?.payment_method === "ach";
  const isGuest = !order?.user_id;

  return (
    <div className="container py-12 max-w-2xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {isACH ? "Order Placed" : "Order Confirmed"}
        </h1>
        <p className="text-muted-foreground">
          {isACH
            ? "Your order has been placed. Payment will be confirmed once your bank transfer clears (1-4 business days)."
            : "Thank you for your purchase. We're preparing your order for shipment."}
        </p>
      </div>

      {/* Order Details Card */}
      {order && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Order #{order.order_id}</h2>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                order.status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {order.status === "paid" ? "Paid" : "Payment Pending"}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4">
              {order.items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{item.name}</span>
                    {item.quantity > 1 && (
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    )}
                  </div>
                  <span className="font-medium">
                    {formatPrice((item.unit_price_cents * item.quantity) / 100)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">
                {formatPrice(order.amount_total_cents / 100)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACH Notice */}
      {isACH && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Bank Transfer Processing</p>
            <p className="text-xs text-amber-700 mt-1">
              ACH payments typically take 1-4 business days to clear. You&apos;ll receive a 
              &quot;Payment Confirmed&quot; email once the transfer is verified. Your order will ship after payment clears.
            </p>
          </div>
        </div>
      )}

      {/* What's Next */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">What Happens Next</h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            {isACH && (
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">1</span>
                <span>Your bank transfer will be verified (1-4 business days). You&apos;ll get an email when it clears.</span>
              </li>
            )}
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">{isACH ? "2" : "1"}</span>
              <span>We&apos;ll prepare your order and ship it within 1-3 business days{isACH ? " after payment clears" : ""}.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">{isACH ? "3" : "2"}</span>
              <span>You&apos;ll receive a shipping confirmation email with tracking information.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">{isACH ? "4" : "3"}</span>
              <span>Inspect your delivery for damage and contact us within 48 hours if there are any issues.</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Create Account CTA for guests */}
      {isGuest && order?.order_token && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <UserPlus className="h-8 w-8 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold">Create an Account</p>
                <p className="text-sm text-muted-foreground">
                  Track this order, view order history, and check out faster next time.
                </p>
              </div>
            </div>
            <Link href={`/order/${order.order_token}/create-account`}>
              <Button>Create Account</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {order?.order_token && (
          <Link href={`/order/${order.order_token}`}>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Track Order
            </Button>
          </Link>
        )}
        <Link href="/catalog">
          <Button size="lg" className="w-full sm:w-auto">Continue Shopping</Button>
        </Link>
      </div>

      {/* Confirmation email note */}
      <p className="text-center text-xs text-muted-foreground mt-6">
        A confirmation email has been sent to <strong>{order?.customer_email ?? "your email"}</strong>.
        Check your spam folder if you don&apos;t see it.
      </p>
    </div>
  );
}
