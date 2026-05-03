import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Order Confirmed | The Heat Pump Ranch & Supply Co.",
  description: "Your order has been placed successfully.",
};

export default function CheckoutSuccessPage() {
  return (
    <div className="container py-16 flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Order Confirmed</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your order. We have received your payment and will begin
            processing your order shortly. You will receive a confirmation email
            with your order details and tracking information.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/catalog">
              <Button size="lg">Continue Shopping</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                View My Account
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
