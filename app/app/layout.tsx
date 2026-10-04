import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BRAND, TAGLINE_EN, TAGLINE_ID } from "@/lib/brand";

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
    <html lang="en">
      <body>
        <div className="wrap">
          <nav>
            <b>🏪 {BRAND}</b>
            <a href="/">Home</a><a href="/dashboard">My shop</a><a href="/pool">Lend</a><a href="/agent">The AI</a><a href="/redteam">Try to break it</a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
