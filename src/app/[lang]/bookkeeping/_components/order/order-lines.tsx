import { Button } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { ComponentProps } from "react";
import { summarizeCalories } from "@/lib/bbq/calories";
import { formatYuan, lineCents } from "@/lib/bbq/money";
import type { DraftLine } from "../../_hooks/use-order-editor";
import { formatCalories } from "../../_lib/i18n";
import { Companion } from "../companion/companion";
import { ItemTagBadge } from "../menu/item-tags";
import { BookkeepingCard } from "../shared/bookkeeping-layout";

export function OrderLines({
  lines,
  groupingEnabled,
  changeQuantity,
}: {
  lines: DraftLine[];
  groupingEnabled: boolean;
  changeQuantity: (key: string, delta: number) => void;
}) {
  const { i18n, t } = useLingui();
  return (
    <BookkeepingCard variant="padded">
      <p className="text-xs tabular-nums text-muted-foreground break-words rounded-lg bg-muted/30 px-2.5 py-2">
        <Trans>热量 {formatCalories(i18n, summarizeCalories(lines))}</Trans>
      </p>
      {lines.length === 0 ? (
        <div className="mt-3 flex min-h-28 flex-col items-center justify-center gap-2 text-center py-2">
          <Companion
            mood={groupingEnabled ? "chef" : "hello"}
            className="block size-16 shrink-0"
          />
          <p className="text-xs text-muted-foreground">
            <Trans>还没有添加项目</Trans>
          </p>
        </div>
      ) : (
        <ul className="mt-2 flex flex-col">
          {lines.map((line) => (
            <li
              key={line.key}
              className="grid items-center gap-1 border-b border-border/40 py-3 last:border-b-0 grid-cols-[minmax(0,1fr)_2.75rem_minmax(1.5rem,auto)_2.75rem] sm:gap-2 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {line.name}
                </p>
                <div className="flex min-w-0 flex-wrap gap-1 empty:hidden mt-1">
                  {line.tags?.map((tag) => (
                    <ItemTagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground wrap-anywhere">
                  {formatYuan(line.priceCents)}/{line.unit}
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  {formatYuan(lineCents(line.priceCents, line.quantity))}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground wrap-anywhere">
                  <Trans>
                    热量 {formatCalories(i18n, summarizeCalories([line]))}
                  </Trans>
                </p>
              </div>
              <QuantityControl
                type="button"
                variant="ghost"
                size="icon"
                aria-label={
                  line.quantity === 1
                    ? t`移除 ${line.name}`
                    : t`减少 ${line.name} 数量`
                }
                onClick={() => changeQuantity(line.key, -1)}
              >
                {line.quantity === 1 ? (
                  <Trash2 className="size-4" aria-hidden="true" />
                ) : (
                  <Minus className="size-4" aria-hidden="true" />
                )}
              </QuantityControl>
              <span className="min-w-6 text-center text-sm font-medium tabular-nums">
                {line.quantity}
              </span>
              <QuantityControl
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t`增加 ${line.name} 数量`}
                onClick={() => changeQuantity(line.key, 1)}
              >
                <Plus className="size-4" aria-hidden="true" />
              </QuantityControl>
            </li>
          ))}
        </ul>
      )}
    </BookkeepingCard>
  );
}

function QuantityControl({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      {...props}
      className={cn(
        "shrink-0 rounded-lg shadow-none transition-colors hover:shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50 focus-visible:ring-offset-0 shinchan:rounded-lg hover:bg-muted/70 size-11",
        className,
      )}
    />
  );
}
