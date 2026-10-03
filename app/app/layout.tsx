import "./globals.css";
import type { ReactNode } from "react";
import { BRAND, TAGLINE_EN, TAGLINE_ID } from "@/lib/brand";

export const metadata = { title: `${BRAND}: ${TAGLINE_ID}`, description: `${TAGLINE_EN} AI micro-credit for Indonesian small shops, enforced on BNB Chain.` };

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
