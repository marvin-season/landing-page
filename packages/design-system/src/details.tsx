"use client";

import { cn as cls } from "@landing-page/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import type * as React from "react";

const detailsMotionCls = cls`
  group/details
  [&::details-content]:grid [&::details-content]:grid-rows-[0fr]
  [&::details-content]:transition-[grid-template-rows,content-visibility]
  [&::details-content]:duration-200 [&::details-content]:ease-out
  [&::details-content]:transition-discrete [&[open]::details-content]:grid-rows-[1fr]
  motion-reduce:[&::details-content]:transition-none
`;

const detailsSummaryCls = cls`
  cursor-pointer text-sm font-medium text-foreground
  flex min-h-11 items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2
  list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-muted/70
  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50 group-open/details:bg-muted/70
`;

const detailsFlushSummaryCls = cls`
  cursor-pointer text-sm font-medium text-foreground
  flex min-h-14 items-center gap-2 rounded-none bg-transparent px-3 py-2
  list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-muted/40
  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset
  focus-visible:ring-primary/50
`;

const detailsChevronCls = cls`
  size-4 shrink-0 text-muted-foreground transition-transform duration-200
  group-open/details:rotate-180 motion-reduce:transition-none
`;

const detailsSummaryVariants = cva("", {
  variants: {
    variant: {
      default: detailsSummaryCls,
      flush: detailsFlushSummaryCls,
    },
  },
  defaultVariants: { variant: "default" },
});

// Keep native open/onToggle behavior; the caller decides when to mount content.
function Details({ className, ...props }: React.ComponentProps<"details">) {
  return (
    <details
      data-slot="details"
      className={cls(className, detailsMotionCls)}
      {...props}
    />
  );
}

function DetailsSummary({
  className,
  variant,
  ...props
}: React.ComponentProps<"summary"> &
  VariantProps<typeof detailsSummaryVariants>) {
  return (
    <summary
      data-slot="details-summary"
      className={cls(detailsSummaryVariants({ variant }), className)}
      {...props}
    />
  );
}

function DetailsContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="details-content"
      className={cls("min-h-0 overflow-clip", className)}
      {...props}
    />
  );
}

function DetailsChevron({
  className,
  ...props
}: React.ComponentProps<typeof ChevronDown>) {
  return (
    <ChevronDown
      data-slot="details-chevron"
      className={cls(detailsChevronCls, className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export {
  Details,
  DetailsSummary,
  DetailsContent,
  DetailsChevron,
  detailsSummaryVariants,
};
