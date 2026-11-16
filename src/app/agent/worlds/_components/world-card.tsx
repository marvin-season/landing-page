import type { ReactNode } from "react";

export function WorldCard({ children }: { children: ReactNode }) {
  return <article className="group">{children}</article>;
}
