import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Use next/font for automatic font optimization:
// - Self-hosts the font (no external network request to Google)
// - Eliminates render-blocking stylesheet
// - Applies size-adjust for zero layout shift
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://heatpumpranchandsupplyco.com"),
  title: {
    default: "The Heat Pump Ranch & Supply Co.",
    template: "%s | The Heat Pump Ranch & Supply Co.",
  },
  description:
    "Residential and light-commercial HVAC equipment from LG and ACiQ. AHRI-certified system packages and expert support.",
  openGraph: {
    type: "website",
    siteName: "The Heat Pump Ranch & Supply Co.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="min-h-screen flex flex-col antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
