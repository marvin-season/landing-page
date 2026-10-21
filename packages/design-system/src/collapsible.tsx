"use client";

import { cn as cls } from "@landing-page/utils";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

const triggerVariants = cva(
  cls`
    cursor-pointer text-sm font-medium text-foreground
    flex items-center gap-2 transition-colors
    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
    focus-visible:ring-primary/50 group/collapsible-trigger w-full text-left
    [&>[data-icon]]:size-4 [&>[data-icon]]:shrink-0 [&>[data-icon]]:text-primary
  `,
  {
    variants: {
      variant: {
        default: cls`min-h-11 rounded-lg bg-muted/40 px-2.5 py-2 hover:bg-muted/70 data-[state=open]:bg-muted/70`,
        flush: cls`min-h-14 rounded-xl bg-transparent px-3 py-2 hover:bg-muted/40`,
        floating: cls`
          min-h-14 relative z-30 h-14 justify-start rounded-xl border border-border/60
          bg-card/85 px-3 py-2 shadow-none backdrop-blur-xl
          hover:bg-card/90 hover:shadow-none
        `,
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const contentVariants = cva("", {
  variants: {
    variant: {
      plain: "",
      // 保留挂载和草稿；固定时长避免 Radix 测量时的内联样式打断过渡。
      collapse: cls`
        grid grid-rows-[0fr] invisible
        data-[state=open]:grid-rows-[1fr] data-[state=open]:visible
        transition-[grid-template-rows,opacity,visibility] duration-200! ease-out
        motion-reduce:transition-none
        opacity-0 data-[state=open]:opacity-100
      `,
      floating: cls`
        min-h-0 max-h-full overflow-y-auto overscroll-y-contain pointer-events-auto
        rounded-xl border border-border/60 bg-card/85 shadow-lg backdrop-blur-xl
        transition-[translate,opacity,visibility] duration-200! ease-out motion-reduce:transition-none
        data-[state=closed]:-translate-y-full data-[state=closed]:invisible p-3
        data-[state=closed]:opacity-0
      `,
    },
  },
  defaultVariants: { variant: "plain" },
});

function Collapsible({
  className,
  variant = "plain",
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root> & {
  variant?: "plain" | "card";
}) {
  return (
    <CollapsiblePrimitive.Root
      data-slot="collapsible"
      className={cls(
        variant === "card" &&
          cls`overflow-hidden rounded-xl bg-card shrink-0 border border-border/60 text-card-foreground shadow-none`,
        className,
      )}
      {...props}
    />
  );
}

function CollapsibleTrigger({
  className,
  variant = "plain",
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger> & {
  variant?: "plain" | "default" | "flush" | "floating";
}) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      className={cls(
        variant !== "plain" && triggerVariants({ variant }),
        className,
      )}
      {...props}
    />
  );
}

function CollapsibleContent({
  className,
  variant = "plain",
  forceMount = variant === "plain" ? undefined : true,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent> &
  VariantProps<typeof contentVariants>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cls(contentVariants({ variant }), className)}
      forceMount={forceMount}
      {...props}
    >
      {variant === "collapse" ? (
        <div data-slot="collapsible-body" className="min-h-0 overflow-clip">
          {children}
        </div>
      ) : (
        children
      )}
    </CollapsiblePrimitive.CollapsibleContent>
  );
}

function CollapsibleTitle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="collapsible-title"
      className={cls("min-w-0 flex-1 text-left", className)}
      {...props}
    />
  );
}

function CollapsibleDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="collapsible-description"
      className={cls("text-xs font-normal text-muted-foreground", className)}
      {...props}
    />
  );
}

function CollapsibleChevron({
  className,
  ...props
}: React.ComponentProps<typeof ChevronDown>) {
  return (
    <ChevronDown
      data-slot="collapsible-chevron"
      className={cls(
        "size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible-trigger:rotate-180 motion-reduce:transition-none",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

function CollapsibleBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-backdrop"
      className={cls(
        "absolute inset-0 z-20 bg-background/40 backdrop-blur-xs transition-opacity duration-200 ease-out motion-reduce:transition-none data-[state=open]:opacity-100 data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0",
        className,
      )}
      tabIndex={-1}
      aria-hidden="true"
      {...props}
    />
  );
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleTitle,
  CollapsibleDescription,
  CollapsibleChevron,
  CollapsibleBackdrop,
};
