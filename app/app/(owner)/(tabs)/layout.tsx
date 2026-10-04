"use client";
import type { ReactNode } from "react";
import { ShopProvider } from "@/components/ShopProvider";
import { TabBar } from "@/components/OwnerBits";

/** Signed-in owner area: shared shop data + the bottom tab bar (top nav on desktop). */
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <ShopProvider>
      {children}
      <TabBar />
    </ShopProvider>
  );
}
