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
      <LoginForm />
      <p className="text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}
