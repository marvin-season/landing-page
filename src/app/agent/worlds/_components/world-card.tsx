import { cn } from "@landing-page/utils";
import type { ReactNode } from "react";
import type { WorldGradient } from "@/lib/group-chat/world-gradient";
import "./world-surface.css";

export function WorldCard({
  tone,
  children,
}: {
  tone: WorldGradient;
  children: ReactNode;
}) {
  return (
    <article className={cn("world-card", `world-card-${tone}`)}>
      {children}
    </article>
  );
}
