"use client";

import { cn } from "@landing-page/utils";
import type * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

function Alert({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        "bg-background text-foreground relative w-full rounded-lg border p-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="alert-title"
      className={cn("mb-1 leading-none font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
