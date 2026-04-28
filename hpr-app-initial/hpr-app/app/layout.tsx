import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://heatpumpranchandsupplyco.com"),
  title: {
    default: "The Heat Pump Ranch & Supply Co.",
    template: "%s | The Heat Pump Ranch & Supply Co.",
  },
  description:
    "Residential and light-commercial HVAC equipment from LG and ACiQ. AHRI-certified system packages, contractor pricing, and expert support.",
  openGraph: {
    type: "website",
    siteName: "The Heat Pump Ranch & Supply Co.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">{children}</body>
    </html>
  );
}
