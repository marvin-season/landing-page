import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Trades",
};

export default function TradesLayout({ children }: { children: ReactNode }) {
  return children;
}
