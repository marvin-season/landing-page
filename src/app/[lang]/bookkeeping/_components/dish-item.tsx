"use client";

import { Button } from "@landing-page/design-system";
import { useLingui } from "@lingui/react/macro";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { summarizeCalories } from "@/lib/bbq/calories";
import { formatYuan } from "@/lib/bbq/money";
import { DEFAULT_TAG, getDishTagIds } from "@/lib/bbq/tags";
import type { Dish, ItemTag } from "@/lib/bbq/types";
import { formatCalories } from "./bbq-i18n";
import { cls } from "./bbq-layout";
import { ItemTagBadge } from "./item-tags";

export function DishItem({
  dish,
  tags,
  quantity,
  onActivate,
  actionLabel,
  actions,
  disabled,
}: {
  dish: Dish;
  tags: ItemTag[];
  quantity: number;
  onActivate: () => void;
  actionLabel: string;
  actions?: ReactNode;
  disabled?: boolean;
}) {
  const { i18n, t } = useLingui();
  const dishTagIds = getDishTagIds(dish);
  const dishTags = dishTagIds.length
    ? tags.filter((tag) => dishTagIds.includes(tag.id))
    : [DEFAULT_TAG];
  const itemCls = cls`flex w-full rounded-lg px-2.5 py-2 text-left text-sm bg-card min-w-0 items-start gap-2 border border-border/60 data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/5`;

  return (
    <article className={itemCls} data-selected={quantity > 0}>
      <button
        type="button"
        className="min-w-0 flex-1 text-left min-h-11 cursor-pointer disabled:cursor-default"
        disabled={disabled}
        aria-label={actionLabel}
        onClick={onActivate}
      >
        <span className="flex min-w-0 items-center gap-1.5 flex-wrap">
          <span
            className="block min-w-0 text-sm font-medium wrap-anywhere"
            title={dish.name}
          >
            {dish.name}
          </span>
          {!dish.listed ? (
            <span className="max-w-full text-xs text-muted-foreground wrap-anywhere">{t`未启用`}</span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs font-normal tabular-nums text-muted-foreground wrap-anywhere">
          {formatYuan(dish.priceCents)}/{dish.unit}
          <span className="mx-1" aria-hidden="true">
            ·
          </span>
          {formatCalories(i18n, summarizeCalories([{ ...dish, quantity: 1 }]))}
        </span>
        {dishTags.length > 0 ? (
          <span className="flex min-w-0 items-center gap-1 [&_[data-slot=item-tag]]:px-1 [&_[data-slot=item-tag]]:py-0 [&_[data-slot=item-tag]]:text-[10px] [&_[data-slot=item-tag]]:leading-4 flex-wrap mt-1">
            {dishTags.map((tag) => (
              <ItemTagBadge key={tag.id} tag={tag} wrap />
            ))}
          </span>
        ) : null}
      </button>
      <div className="flex w-20 shrink-0 items-center justify-end gap-0.5">
        {actions ?? (
          <Button
            type="button"
            variant="subtle"
            className="h-9 min-w-9 rounded-lg px-2 gap-1.5 shadow-none max-w-full"
            disabled={disabled}
            aria-label={actionLabel}
            onClick={onActivate}
          >
            {quantity > 0 ? (
              <span
                className="text-xs tabular-nums min-w-0 truncate"
                title={String(quantity)}
              >
                {quantity}
              </span>
            ) : null}
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  );
}
