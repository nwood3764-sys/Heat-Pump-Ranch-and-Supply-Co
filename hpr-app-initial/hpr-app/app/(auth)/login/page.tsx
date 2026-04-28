import { Suspense } from "react";
import { LoginForm } from "./login-form";
import Link from "next/link";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="container max-w-md py-16">
      <h1 className="text-2xl font-bold mb-2">Sign In</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Sign in to view your orders, saved quotes, and contractor pricing.
      </p>
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div>
        <div className="block text-sm font-medium mb-1.5">Email</div>
        <div className="h-10 w-full rounded-md border bg-muted/30" />
      </div>
      <div>
        <div className="block text-sm font-medium mb-1.5">Password</div>
        <div className="h-10 w-full rounded-md border bg-muted/30" />
      </div>
      <div className="h-11 w-full rounded-md bg-muted/50" />
    </div>
  );
}
