"use client";

import { cn } from "@landing-page/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { getPaginationItems } from "./pagination-items";

export function Pagination({
  count,
  page,
  onPageChange,
  disabled,
  max = 5,
  previousLabel = "上一页",
  nextLabel = "下一页",
  previousTitle,
  nextTitle,
  getPageLabel,
  getPageTitle,
  getPageAriaLabel,
  getPageClassName,
  className,
  "aria-label": ariaLabel = "分页",
}: {
  count: number;
  page: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  max?: number;
  previousLabel?: string;
  nextLabel?: string;
  previousTitle?: string;
  nextTitle?: string;
  getPageLabel?: (page: number) => ReactNode;
  getPageTitle?: (page: number) => string | undefined;
  getPageAriaLabel?: (page: number) => string | undefined;
  getPageClassName?: (page: number) => string | undefined;
  className?: string;
  "aria-label"?: string;
}) {
  if (count <= 0) return null;
  const current = Math.min(Math.max(page, 1), count);
  const items = getPaginationItems(count, current, { max });

  function select(next: number) {
    if (next !== current) onPageChange(next);
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn("flex items-center gap-1", className)}
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-9 shrink-0"
        aria-label={previousLabel}
        title={previousTitle ?? previousLabel}
        disabled={disabled || current <= 1}
        onClick={() => select(current - 1)}
      >
        <ChevronLeft />
      </Button>
      {items.map((item) =>
        item.type === "ellipsis" ? (
          <PaginationEllipsis
            key={`ellipsis-${item.pages[0]}`}
            pages={item.pages}
            disabled={disabled}
            getPageLabel={getPageLabel}
            getPageTitle={getPageTitle}
            getPageAriaLabel={getPageAriaLabel}
            getPageClassName={getPageClassName}
            onSelect={select}
          />
        ) : (
          <Button
            key={item.page}
            type="button"
            size="icon"
            variant={item.page === current ? "default" : "outline"}
            className={cn(
              "size-9 shrink-0 px-0 text-xs tabular-nums",
              getPageClassName?.(item.page),
            )}
            aria-current={item.page === current ? "page" : undefined}
            aria-label={getPageAriaLabel?.(item.page) ?? `第${item.page}页`}
            title={getPageTitle?.(item.page)}
            disabled={disabled}
            onClick={() => select(item.page)}
          >
            {getPageLabel?.(item.page) ?? item.page}
          </Button>
        ),
      )}
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-9 shrink-0"
        aria-label={nextLabel}
        title={nextTitle ?? nextLabel}
        disabled={disabled || current >= count}
        onClick={() => select(current + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}

function PaginationEllipsis({
  pages,
  disabled,
  getPageLabel,
  getPageTitle,
  getPageAriaLabel,
  getPageClassName,
  onSelect,
}: {
  pages: number[];
  disabled?: boolean;
  getPageLabel?: (page: number) => ReactNode;
  getPageTitle?: (page: number) => string | undefined;
  getPageAriaLabel?: (page: number) => string | undefined;
  getPageClassName?: (page: number) => string | undefined;
  onSelect: (page: number) => void;
}) {
  const [active, setActive] = useState(pages[0] ?? 1);
  const first = pages[0];
  const last = pages[pages.length - 1];
  const activeTitle = getPageTitle?.(active);
  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => {
        if (open) setActive(first ?? 1);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-9 shrink-0 px-0 text-xs"
          aria-label={`展开第${first}到第${last}页`}
          title={`第${first}–${last}页`}
          disabled={disabled}
        >
          …
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-0 p-2">
        {activeTitle ? (
          <p className="mb-2 max-w-52 truncate px-1 text-xs">{activeTitle}</p>
        ) : null}
        <div className="grid max-h-52 grid-cols-5 gap-1 overflow-y-auto">
          {pages.map((item) => (
            <DropdownMenuItem
              key={item}
              className={cn(
                "size-8 justify-center px-0 text-xs tabular-nums",
                getPageClassName?.(item),
              )}
              aria-label={getPageAriaLabel?.(item) ?? `第${item}页`}
              title={getPageTitle?.(item)}
              onFocus={() => setActive(item)}
              onPointerMove={() => setActive(item)}
              onSelect={() => onSelect(item)}
            >
              {getPageLabel?.(item) ?? item}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
