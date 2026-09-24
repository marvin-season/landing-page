import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import TankQueryClientProvider from "@/components/trpc/provider";

export const metadata: Metadata = {
  title: "Admin",
  description: "Internal tools and experiments",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AdminLayout({ children }: PropsWithChildren) {
  return <TankQueryClientProvider>{children}</TankQueryClientProvider>;
}
