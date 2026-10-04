import type { ReactNode } from "react";
import { OfflineNotice, TestBanner } from "@/components/OwnerBits";

/** Owner site (Bahasa, phone first): pinned test banner, one centered column. */
export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell" data-site="owner">
      <TestBanner />
      <OfflineNotice />
      {children}
    </div>
  );
}
