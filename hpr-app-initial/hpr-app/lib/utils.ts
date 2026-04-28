import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

export function calculateSavings(msrp: number | string | null, sale: number | string | null) {
  if (!msrp || !sale) return null;
  const m = typeof msrp === "string" ? parseFloat(msrp) : msrp;
  const s = typeof sale === "string" ? parseFloat(sale) : sale;
  if (Number.isNaN(m) || Number.isNaN(s) || m <= s) return null;
  const amount = m - s;
  const percent = Math.round((amount / m) * 100);
  return { amount, percent };
}
