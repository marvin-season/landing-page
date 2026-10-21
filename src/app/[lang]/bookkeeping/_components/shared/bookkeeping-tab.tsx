"use client";

import { cn } from "@landing-page/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const tabVariants = cva("", {
  variants: {
    variant: {
      view: "inline-flex items-center justify-center rounded-none font-medium transition-colors min-h-11 gap-1.5 px-1 text-sm [&>svg]:size-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 min-w-0 duration-150 active:bg-primary/10 touch-manipulation motion-reduce:transition-none border-b-2 data-[selected=true]:text-foreground data-[selected=true]:border-primary data-[selected=false]:text-muted-foreground data-[selected=false]:hover:text-foreground data-[selected=false]:border-transparent",
      status:
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors min-h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 duration-150 active:bg-primary/10 touch-manipulation motion-reduce:transition-none data-[selected=true]:bg-background data-[selected=true]:text-primary data-[selected=true]:shadow-sm data-[selected=false]:text-muted-foreground data-[selected=false]:hover:text-foreground",
      chart:
        "inline-flex items-center justify-center rounded-md px-3 text-xs font-medium transition-colors flex-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 min-h-11 data-[selected=true]:bg-card data-[selected=true]:text-foreground data-[selected=true]:shadow-sm data-[selected=false]:text-muted-foreground data-[selected=false]:hover:text-foreground",
    },
  },
});

export function BookkeepingTab({
  selected,
  variant,
  className,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof tabVariants> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-selected={selected}
      className={cn(tabVariants({ variant }), className)}
      {...props}
    />
  );
}
