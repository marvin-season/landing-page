"use client";

import { Button, Input } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import type { ComponentProps } from "react";

export function SettingsAction({
  tone = "default",
  className,
  ...props
}: ComponentProps<typeof Button> & { tone?: "default" | "danger" }) {
  return (
    <Button
      type="button"
      variant="ghost"
      {...props}
      className={cn(
        "min-h-11 w-full justify-center rounded-lg px-3 text-sm shadow-none hover:bg-muted/70 hover:shadow-none focus-visible:ring-inset border border-border/60 bg-muted/30 text-foreground",
        tone === "danger" &&
          "text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
    />
  );
}

export function SettingsInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "h-11 rounded-lg border-border/60 bg-muted/30 shadow-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 dark:bg-muted/30 shinchan:bg-muted/30 apple:bg-muted/30 apple:backdrop-blur-none",
        className,
      )}
    />
  );
}

export function SettingsRadioOption({
  className,
  ...props
}: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-checked:border-primary/40 has-checked:bg-primary/5 has-disabled:cursor-not-allowed has-disabled:opacity-50 border-border/60 bg-muted/30 text-foreground transition-colors hover:bg-muted/50 has-focus-visible:ring-1 has-focus-visible:ring-primary/50",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsRadioInput({
  className,
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      type="radio"
      className={cn("size-4 shrink-0 accent-primary", className)}
      {...props}
    />
  );
}

export function SettingsGroupLabel({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "shrink-0 px-1 pt-3 text-xs font-medium text-muted-foreground first:pt-0",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsPreference({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "shrink-0 [&>button]:min-h-8 [&>button]:min-w-16 [&>button]:rounded-md [&>button]:border [&>button]:border-border/60 [&>button]:bg-muted/30 [&>button]:px-2 [&>button]:text-foreground [&>button:hover]:bg-muted/70 [&>button]:text-sm [&>button:focus-visible]:ring-1 [&>button:focus-visible]:ring-primary/50",
        className,
      )}
      {...props}
    />
  );
}
