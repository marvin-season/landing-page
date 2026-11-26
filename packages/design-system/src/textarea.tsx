import { cn } from "@landing-page/utils";
import type { ComponentProps } from "react";

export function Textarea({
  className,
  variant = "subtle",
  ...props
}: ComponentProps<"textarea"> & { variant?: "subtle" | "plain" }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "block w-full min-w-0 resize-y rounded-lg border px-3 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground/75 transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-ring/45 aria-invalid:border-destructive",
        variant === "subtle"
          ? "border-border/55 bg-muted/25"
          : "border-transparent bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
