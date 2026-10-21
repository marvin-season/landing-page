"use client";

import { Button } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

export function CalendarControl({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      {...props}
      className={cn(
        "rounded-lg shadow-none transition-colors duration-150 hover:bg-muted/70 hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0 focus-visible:bg-muted/70 shinchan:rounded-lg min-h-11",
        className,
      )}
    />
  );
}

export function CalendarDate({
  state,
  today,
  className,
  ...props
}: ComponentProps<typeof Slot> & {
  state: "selected" | "recorded" | "empty";
  today: boolean;
}) {
  return (
    <Slot
      {...props}
      className={cn(
        "flex min-h-12 flex-col items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-1 border duration-150 focus-visible:ring-inset",
        state === "selected"
          ? "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:bg-primary/90 focus-visible:ring-primary-foreground/70"
          : state === "recorded"
            ? "bg-primary/5 text-foreground hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-primary/50"
            : "text-muted-foreground hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:ring-primary/50",
        today && state !== "selected"
          ? "border-primary/30"
          : "border-transparent",
        className,
      )}
    />
  );
}
