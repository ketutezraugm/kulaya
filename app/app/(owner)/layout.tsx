import type { ReactNode } from "react";
import { TestBanner } from "@/components/OwnerBits";

/** Owner site (Bahasa, phone first): pinned test banner, one centered column. */
export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell" data-site="owner">
      <TestBanner />
      {children}
    </div>
  );
}
