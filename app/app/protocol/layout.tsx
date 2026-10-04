import type { ReactNode } from "react";
import { JetBrains_Mono } from "next/font/google";
import { ProtocolShell } from "@/components/ProtocolShell";
import "./protocol.css";

// the mono font ships only on protocol routes
const mono = JetBrains_Mono({ weight: ["400", "600"], subsets: ["latin"], variable: "--f-mono", display: "swap" });

export const metadata = { title: "Kulaya Protocol: credit that grows from every sale", description: "AI micro-credit for Indonesian small shops, enforced on BNB Chain. The AI proposes, the contract decides." };

export default function ProtocolLayout({ children }: { children: ReactNode }) {
  return <div className={mono.variable}><ProtocolShell>{children}</ProtocolShell></div>;
}
