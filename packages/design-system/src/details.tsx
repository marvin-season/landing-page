"use client";

import { cn as cls } from "@landing-page/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import * as React from "react";

type DetailsProps = React.ComponentProps<"details"> & {
  /** Floating panels stay inside the current layout/stacking context (no portal). */
  mode?: "flow" | "floating";
  side?: "top" | "bottom";
  backdrop?: "blur" | "none";
  /** Defaults to the viewport; use `absolute` for a positioned parent scope. */
  backdropClassName?: string;
};

const DetailsContext = React.createContext<"top" | "bottom" | null>(null);

const detailsFloatingCls = cls`
  group/details relative overflow-visible
  [&::details-content]:block
  [&::details-content]:transition-[content-visibility]
  [&::details-content]:duration-200 [&::details-content]:transition-discrete
  [&>summary]:relative [&>summary]:z-30
  [&[open]>[data-slot=details-content]>[data-slot=details-panel]]:translate-y-0
  [&[open]>[data-slot=details-backdrop]]:opacity-100
  starting:[&[open][data-side=bottom]>[data-slot=details-content]>[data-slot=details-panel]]:-translate-y-full
  starting:[&[open][data-side=top]>[data-slot=details-content]>[data-slot=details-panel]]:translate-y-full
  starting:[&[open][data-mode=floating]>[data-slot=details-backdrop]]:opacity-0
  [&:not([open])>[data-slot=details-content]>[data-slot=details-panel]]:pointer-events-none
  [&:not([open])>[data-slot=details-backdrop]]:pointer-events-none
  motion-reduce:[&::details-content]:transition-none
`;

const detailsBackdropCls = cls`
  fixed inset-0 z-20 bg-background/40 backdrop-blur-xs opacity-0
  transition-opacity duration-200 ease-out motion-reduce:transition-none
`;

const detailsFloatingContentCls = cls`
  absolute inset-x-0 z-30 flex flex-col max-h-[min(32rem,70dvh)] overflow-clip pointer-events-none
`;

const detailsPanelCls = cls`
  min-h-0 max-h-[inherit] overflow-y-auto overscroll-y-contain pointer-events-auto
  rounded-xl border border-border/60 bg-card/85 shadow-lg backdrop-blur-xl
  transition-transform duration-200 ease-out motion-reduce:transition-none
`;

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
function Details({
  className,
  mode = "flow",
  side = "bottom",
  backdrop = "blur",
  backdropClassName,
  children,
  onKeyDown,
  ...props
}: DetailsProps) {
  const floating = mode === "floating";
  return (
    <DetailsContext value={floating ? side : null}>
      <details
        data-slot="details"
        data-mode={mode}
        data-side={floating ? side : undefined}
        className={
          floating
            ? cls(detailsFloatingCls, className)
            : cls(className, detailsMotionCls)
        }
        onKeyDown={
          floating
            ? (event) => {
                onKeyDown?.(event);
                if (
                  event.key === "Escape" &&
                  !event.defaultPrevented &&
                  event.currentTarget.open
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }
            : onKeyDown
        }
        {...props}
      >
        {children}
        {floating && backdrop === "blur" ? (
          <button
            type="button"
            data-slot="details-backdrop"
            className={cls(detailsBackdropCls, backdropClassName)}
            tabIndex={-1}
            aria-hidden="true"
            onClick={(event) => {
              const details = event.currentTarget.closest("details");
              if (details) {
                details.open = false;
                details.querySelector("summary")?.focus();
              }
            }}
          />
        ) : null}
      </details>
    </DetailsContext>
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

function DetailsContent({
  className,
  floatingClassName,
  ...props
}: React.ComponentProps<"div"> & {
  /** Floating positioning/clipping shell; className styles the scrollable panel. */
  floatingClassName?: string;
}) {
  const side = React.use(DetailsContext);
  if (side) {
    return (
      <div
        data-slot="details-content"
        className={cls(
          detailsFloatingContentCls,
          side === "top" ? "bottom-full" : "top-full",
          floatingClassName,
        )}
      >
        <div
          data-slot="details-panel"
          className={cls(
            detailsPanelCls,
            side === "top" ? "translate-y-full" : "-translate-y-full",
            className,
          )}
          {...props}
        />
      </div>
    );
  }
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
  type DetailsProps,
  Details,
  DetailsSummary,
  DetailsContent,
  DetailsChevron,
  detailsSummaryVariants,
};
