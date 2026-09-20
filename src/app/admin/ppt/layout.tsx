import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PPT",
};

export default function PptLayout({ children }: { children: ReactNode }) {
  return children;
}
