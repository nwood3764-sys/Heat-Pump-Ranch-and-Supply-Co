import { SignupForm } from "./signup-form";
import Link from "next/link";

export const metadata = { title: "Create Account" };

export default function SignupPage() {
  return (
    <div className="container max-w-md py-16">
      <h1 className="text-2xl font-bold mb-2">Create Account</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Track orders, save quotes, and check out faster.
      </p>
      <SignupForm />
      <p className="text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
