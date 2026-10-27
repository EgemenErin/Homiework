import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Young_Serif } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  adjustFontFallback: false,
});

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Homiework",
    template: "%s – Homiework",
  },
  description:
    "One topic a week, picked by one of your friends. Do the homework, then meet up and talk it out.",
  applicationName: "Homiework",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "64x64" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "Homiework",
    title: "Homiework — One topic a week, picked by your friends",
    description:
      "Everyone does the homework. Then you meet up and talk about it.",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "Homiework",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Homiework — One topic a week, picked by your friends",
    description:
      "Everyone does the homework. Then you meet up and talk about it.",
    images: ["/brand/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Homiework",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#faf7f3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${youngSerif.variable}`}>
      <body className="min-h-dvh bg-desk-deep text-ink">
        <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-desk relative flex flex-col md:shadow-2xl md:border-x md:border-rule/60">
          {children}
        </div>
        <ServiceWorker />
      </body>
    </html>
  );
}
