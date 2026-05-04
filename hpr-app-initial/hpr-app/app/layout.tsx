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
  metadataBase: new URL("https://heatpumpranch.com"),
  title: {
    default: "The Heat Pump Ranch & Supply Co. — HVAC Equipment Direct",
    template: "%s | The Heat Pump Ranch & Supply Co.",
  },
  description:
    "Shop residential and light-commercial heat pumps, mini-splits, and HVAC equipment from LG and ACiQ. AHRI-certified systems, dealer pricing, and nationwide shipping.",
  keywords: [
    "heat pump",
    "mini split",
    "HVAC equipment",
    "ACiQ heat pump",
    "LG mini split",
    "residential heat pump",
    "air handler",
    "heat pump water heater",
    "AHRI certified",
    "buy heat pump online",
  ],
  authors: [{ name: "The Heat Pump Ranch & Supply Co." }],
  creator: "The Heat Pump Ranch & Supply Co.",
  publisher: "The Heat Pump Ranch & Supply Co.",
  openGraph: {
    type: "website",
    siteName: "The Heat Pump Ranch & Supply Co.",
    title: "The Heat Pump Ranch & Supply Co. — HVAC Equipment Direct",
    description:
      "Shop residential and light-commercial heat pumps, mini-splits, and HVAC equipment. AHRI-certified systems with nationwide shipping.",
    url: "https://heatpumpranch.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Heat Pump Ranch & Supply Co.",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Heat Pump Ranch & Supply Co.",
    description:
      "Shop heat pumps, mini-splits, and HVAC equipment direct. AHRI-certified systems with nationwide shipping.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://heatpumpranch.com",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              name: "The Heat Pump Ranch & Supply Co.",
              description:
                "Residential and light-commercial HVAC equipment from LG and ACiQ. AHRI-certified system packages.",
              url: "https://heatpumpranch.com",
              telephone: "+1-608-830-9224",
              email: "orders@heatpumpranch.com",
              priceRange: "$$",
              openingHoursSpecification: {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "08:00",
                closes: "17:00",
              },
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
