import { cn } from "@landing-page/utils";
import type { KeyboardEvent } from "react";
import type { AiMentionItem } from "./types";

export function MentionMenu<T>({
  items,
  activeIndex,
  emptyLabel,
  listId,
  onActiveIndexChange,
  onSelect,
}: {
  items: readonly AiMentionItem<T>[];
  activeIndex: number;
  emptyLabel: string;
  listId: string;
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: AiMentionItem<T>) => void;
}) {
  return (
    <div
      id={listId}
      role="listbox"
      className="absolute inset-x-0 bottom-full z-20 mb-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-md"
    >
      {items.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        items.map((item, index) => {
          const optionId = `${listId}-${item.id}`;
          const active = index === activeIndex;
          return (
            <button
              key={item.id}
              id={optionId}
              type="button"
              role="option"
              aria-selected={active}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/60",
              )}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(item);
              }}
            >
              {item.icon ? (
                <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4">
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.label}</span>
                {item.description ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

export function mentionMenuKey(
  event: KeyboardEvent,
  itemCount: number,
): "up" | "down" | "select" | "close" | null {
  if (event.key === "Escape") return "close";
  if (event.key === "ArrowDown") return itemCount > 0 ? "down" : null;
  if (event.key === "ArrowUp") return itemCount > 0 ? "up" : null;
  if (event.key === "Enter" || event.key === "Tab") {
    return itemCount > 0 ? "select" : "close";
  }
  return null;
}

export function nextMentionIndex(
  current: number,
  itemCount: number,
  direction: "up" | "down",
): number {
  if (itemCount <= 0) return 0;
  if (direction === "down") return (current + 1) % itemCount;
  return (current - 1 + itemCount) % itemCount;
}
