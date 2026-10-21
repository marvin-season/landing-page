import { cn } from "@landing-page/utils";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

export function BookkeepingPage({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export function BookkeepingTitle({
  className,
  ...props
}: ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "text-2xl font-semibold text-foreground tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function BookkeepingCard({
  asChild = false,
  variant = "default",
  className,
  ...props
}: ComponentProps<"section"> & {
  asChild?: boolean;
  variant?: "default" | "padded";
}) {
  const Comp = asChild ? Slot : "section";
  return (
    <Comp
      className={cn(
        "overflow-hidden rounded-xl bg-card shrink-0 border border-border/60 text-card-foreground shadow-none",
        variant === "padded" && "p-3",
        className,
      )}
      {...props}
    />
  );
}
