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
    "Your group takes turns picking what to learn each week, then meets up to talk it through.",
  applicationName: "Homiework",
  appleWebApp: {
    capable: true,
    title: "Homiework",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#e4e9f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${youngSerif.variable}`}>
      <body className="min-h-dvh">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
