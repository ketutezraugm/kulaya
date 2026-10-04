import "./tokens.css";
import "./globals.css";
import { Bree_Serif, Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BRAND, TAGLINE_EN, TAGLINE_ID } from "@/lib/brand";

const bree = Bree_Serif({ weight: "400", subsets: ["latin"], variable: "--f-bree", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ weight: ["400", "500", "600", "700", "800"], subsets: ["latin"], variable: "--f-jakarta", display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kulaya.vercel.app";
const TITLE = `${BRAND}: ${TAGLINE_ID}`;
const DESCRIPTION = `${TAGLINE_EN} AI micro-credit for Indonesian small shops, enforced on BNB Chain.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/favicon.svg", type: "image/svg+xml" }, { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: { title: TITLE, description: DESCRIPTION, url: SITE, siteName: BRAND, locale: "id_ID", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: `${BRAND}: ${TAGLINE_ID}` }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
  appleWebApp: { capable: true, title: BRAND, statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1E2A5A", width: "device-width", initialScale: 1 };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${bree.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
