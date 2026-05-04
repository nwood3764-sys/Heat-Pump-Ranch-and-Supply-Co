"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CreditCard, Building2, Loader2, ShieldCheck, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const CC_SURCHARGE_RATE = 0.029;
const CC_SURCHARGE_FLAT = 0.30;

function calculateSurcharge(subtotal: number): number {
  const total = (subtotal + CC_SURCHARGE_FLAT) / (1 - CC_SURCHARGE_RATE);
  return Math.round((total - subtotal) * 100) / 100;
}

export function CheckoutPageClient() {
  const { cart, refreshCart } = useCart();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Ensure cart data is loaded when visiting checkout directly
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Check auth state
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkAuth();
  }, []);

  const [paymentMethod, setPaymentMethod] = useState<"ach" | "card">("ach");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const surcharge = paymentMethod === "card" ? calculateSurcharge(cart.subtotal) : 0;
  const total = cart.subtotal + surcharge;

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, cartId: cart.cartId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your project is empty</h1>
        <p className="text-muted-foreground mb-6">Add some items before checking out.</p>
        <Link href="/catalog">
          <Button size="lg">Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
        <Link href="/project" className="hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back to My Project
        </Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-8">Checkout</h1>

      {/* Sign-in prompt for guest users */}
      {isLoggedIn === false && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1">
            <User className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Have an account?</p>
              <p className="text-xs text-muted-foreground">Sign in to track your order and check out faster next time.</p>
            </div>
          </div>
          <Link href="/login?redirect=/checkout">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment method selection */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Choose Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ACH Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod("ach")}
                className={`relative flex flex-col items-start gap-3 rounded-lg border-2 p-5 text-left transition-all ${
                  paymentMethod === "ach"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    paymentMethod === "ach" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Bank Payment (ACH)</div>
                    <div className="text-sm text-green-600 font-medium">No processing fee</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pay directly from your bank account. No additional charges.
                  Funds are verified securely through Stripe.
                </p>
                {paymentMethod === "ach" && (
                  <div className="absolute top-3 right-3">
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <ShieldCheck className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>

              {/* Credit Card Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`relative flex flex-col items-start gap-3 rounded-lg border-2 p-5 text-left transition-all ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    paymentMethod === "card" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Credit / Debit Card</div>
                    <div className="text-sm text-amber-600 font-medium">
                      + {formatPrice(surcharge || calculateSurcharge(cart.subtotal))} processing fee
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Visa, Mastercard, American Express, and Discover accepted.
                  A 2.9% + $0.30 processing fee applies.
                </p>
                {paymentMethod === "card" && (
                  <div className="absolute top-3 right-3">
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <ShieldCheck className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Surcharge notice for card payments */}
          {paymentMethod === "card" && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Credit Card Processing Fee: {formatPrice(surcharge)}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  A processing fee of 2.9% + $0.30 will be added to your order total to cover
                  credit card transaction costs. You can avoid this fee by selecting Bank Payment (ACH).
                </p>
              </div>
            </div>
          )}

          {/* Order items summary */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={item.cartItemId} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded bg-muted">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} &times; {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <div className="text-sm font-semibold whitespace-nowrap">
                    {formatPrice(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order total sidebar */}
        <div>
          <Card className="sticky top-20">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Order Total</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
                  </span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>

                {paymentMethod === "card" && (
                  <div className="flex justify-between text-amber-700">
                    <span>CC Processing Fee</span>
                    <span>+ {formatPrice(surcharge)}</span>
                  </div>
                )}

                {paymentMethod === "ach" && (
                  <div className="flex justify-between text-green-600">
                    <span>ACH Processing Fee</span>
                    <span>$0.00</span>
                  </div>
                )}
              </div>

              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                className="w-full mt-6"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : paymentMethod === "ach" ? (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Pay {formatPrice(total)} via Bank
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay {formatPrice(total)} via Card
                  </>
                )}
              </Button>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                You will be redirected to Stripe&apos;s secure checkout to complete payment.
              </p>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>Secured by Stripe</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
