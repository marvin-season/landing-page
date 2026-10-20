import { Button } from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { Minus, Plus, Trash2 } from "lucide-react";
import { summarizeCalories } from "@/lib/bbq/calories";
import { formatYuan, lineCents } from "@/lib/bbq/money";
import type { DraftLine } from "../../_hooks/use-order-editor";
import { formatCalories } from "../../_lib/bbq-i18n";
import {
  editorControlCls,
  editorSectionCls,
} from "../../_styles/order-editor-styles";
import { BbqCompanion } from "../companion/bbq-companion";
import { ItemTagBadge } from "../menu/item-tags";

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
    <section className={editorSectionCls}>
      <p className="text-xs tabular-nums text-muted-foreground break-words rounded-lg bg-muted/30 px-2.5 py-2">
        <Trans>热量 {formatCalories(i18n, summarizeCalories(lines))}</Trans>
      </p>
      {lines.length === 0 ? (
        <div className="mt-3 flex min-h-28 flex-col items-center justify-center gap-2 text-center py-2">
          <BbqCompanion
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`shrink-0 ${editorControlCls} hover:bg-muted/70 size-11`}
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
              </Button>
              <span className="min-w-6 text-center text-sm font-medium tabular-nums">
                {line.quantity}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`shrink-0 ${editorControlCls} hover:bg-muted/70 size-11`}
                aria-label={t`增加 ${line.name} 数量`}
                onClick={() => changeQuantity(line.key, 1)}
              >
                <Plus className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
