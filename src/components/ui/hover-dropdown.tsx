import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DropdownItem = {
  id: string;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

type HoverDropdownProps = {
  trigger: ReactNode;
  items: DropdownItem[];
  activeId?: string;
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
  contentClassName?: string;
  itemClassName?: string;
  activeItemClassName?: string;
};

export const HoverDropdown = ({
  trigger,
  items,
  activeId,
  align = "right",
  width = "w-40",
  className,
  contentClassName,
  itemClassName,
  activeItemClassName,
}: HoverDropdownProps) => {
  const alignClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 -translate-x-1/2",
  };

  return (
    <div className={cn("group relative", className)}>
      {trigger}
      <div
        className={cn(
          "invisible absolute top-full z-50 mt-2 rounded-md border border-border bg-card shadow-lg opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100",
          width,
          alignClasses[align],
          contentClassName,
        )}
      >
        <div className="py-1">
          {items.map((item) => {
            const isActive = item.id === activeId;
            const baseItemClasses = cn(
              "block px-4 py-2 text-sm transition-colors",
              isActive
                ? cn(
                    "bg-accent font-medium text-foreground",
                    activeItemClassName,
                  )
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              item.disabled && "pointer-events-none opacity-50",
              itemClassName,
              item.className,
            );

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch
                  className={baseItemClasses}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                disabled={item.disabled}
                className={baseItemClasses}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
