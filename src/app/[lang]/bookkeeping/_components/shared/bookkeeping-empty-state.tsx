"use client";

import { cn } from "@landing-page/utils";
import type { ComponentProps, ReactNode } from "react";
import type { CompanionMood } from "@/lib/bbq/companion-album";
import { Companion } from "../companion/companion";

export function BookkeepingEmptyState({
  mood = "hello",
  title,
  description,
  action,
  className,
  companionClassName,
  ...props
}: {
  mood?: CompanionMood;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  companionClassName?: string;
} & Omit<ComponentProps<"div">, "title" | "children">) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-6 text-center",
        className,
      )}
      {...props}
    >
      <Companion
        mood={mood}
        className={cn("block size-28 shrink-0", companionClassName)}
      />
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
