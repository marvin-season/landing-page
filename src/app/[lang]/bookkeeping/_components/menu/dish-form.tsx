"use client";

import { Button, Input } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

export function MenuSurface({
  asChild = false,
  className,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      {...props}
      className={cn(
        "[&_[data-slot=input]]:bg-card [&_[data-slot=select-trigger]]:bg-card [&_[data-slot=item-tag]]:bg-secondary/50 [&_[data-slot=item-tag]]:text-secondary-foreground! [&_[data-slot=item-tag]]:border-border!",
        className,
      )}
    />
  );
}

export function DishForm({ className, ...props }: ComponentProps<"fieldset">) {
  return (
    <MenuSurface asChild>
      <fieldset
        {...props}
        className={cn(
          "grid grid-cols-2 gap-x-3 gap-y-2.5 min-w-0 items-end",
          className,
        )}
      />
    </MenuSurface>
  );
}

export function DishField({
  asChild = false,
  className,
  ...props
}: ComponentProps<"label"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "label";
  return (
    <Comp {...props} className={cn("flex min-w-0 flex-col gap-1", className)} />
  );
}

export function DishFieldLabel({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground text-xs leading-4 wrap-anywhere",
        className,
      )}
      {...props}
    />
  );
}

export function DishHint({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-muted-foreground text-xs leading-relaxed mb-3",
        className,
      )}
      {...props}
    />
  );
}

export function DishInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={cn(
        "w-full min-w-0 rounded-lg border bg-card shadow-none h-9 px-2 text-base focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0 placeholder:text-sm text-card-foreground border-border/60 focus-visible:border-primary/50 placeholder:text-muted-foreground/70 placeholder:font-normal placeholder:opacity-100 dark:bg-card shinchan:bg-card apple:rounded-lg apple:bg-card apple:backdrop-blur-none",
        className,
      )}
    />
  );
}

export function DishTagButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      className={cn(
        "rounded-lg border border-border/60 bg-card shadow-none hover:bg-muted/40 hover:shadow-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0 shinchan:rounded-lg shinchan:bg-card apple:rounded-lg apple:bg-card apple:backdrop-blur-none",
        className,
      )}
    />
  );
}
