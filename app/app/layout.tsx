import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Warung Agent", description: "AI micro-credit for Indonesian small shops, enforced on BNB Chain." };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <nav>
            <b>🏪 Warung Agent</b>
            <a href="/">Home</a><a href="/pool">Lend</a><a href="/agent">The AI</a><a href="/redteam">Try to break it</a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
