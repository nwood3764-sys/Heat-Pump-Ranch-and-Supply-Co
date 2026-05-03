import type { Metadata } from "next";
import { CheckoutPageClient } from "./checkout-page-client";

export const metadata: Metadata = {
  title: "Checkout | The Heat Pump Ranch & Supply Co.",
  description: "Complete your purchase. Choose ACH bank payment (no extra charge) or credit card.",
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
