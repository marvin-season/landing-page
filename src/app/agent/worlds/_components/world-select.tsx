"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import type { ReactNode } from "react";

export function WorldSelect({
  label,
  value,
  onValueChange,
  disabled,
  size,
  title,
  className,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "default";
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        aria-label={label}
        size={size}
        title={title}
        className={cn(
          "min-w-0 rounded-lg border-border/55 bg-muted/25 shadow-none transition-colors hover:bg-muted/40 focus-visible:border-ring/45 focus-visible:ring-0 dark:bg-muted/25 dark:hover:bg-muted/40 *:data-[slot=select-value]:block *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        className="max-w-[min(26rem,var(--radix-select-content-available-width))] rounded-lg border-border/65 [&_[data-slot=select-item]>span:last-child]:min-w-0 [&_[data-slot=select-item]>span:last-child]:wrap-anywhere"
      >
        <SelectGroup>{children}</SelectGroup>
      </SelectContent>
    </Select>
  );
}
