import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { Bookmark, ChevronDown, Plus } from "lucide-react";
import { type RefObject, useState } from "react";
import { matchesTag, resolveTagFilter } from "@/lib/bbq/tags";
import type { Dish, ItemTag } from "@/lib/bbq/types";
import {
  collapsibleChevronCls,
  collapsibleContentCls,
  collapsibleFlushTriggerCls,
} from "../../_styles/collapsible-styles";
import { dishHintCls } from "../../_styles/dish-form-styles";
import { settingsCardCls } from "../../_styles/settings-styles";
import { Companion } from "../companion/companion";
import { SearchInput } from "../shared/search-input";
import { DishRow } from "./dish-row";
import { ItemTagFilter } from "./item-tags";
import { MenuLoadStatus } from "./menu-load-status";

export function DishList({
  headerRef,
  categoryId,
  dishes,
  tags,
  phase,
  listRequested,
  onRequest,
  onRequestList,
  onRetry,
  onTagsChanged,
  onSaved,
  onError,
}: {
  headerRef: RefObject<HTMLDivElement | null>;
  categoryId: string | null;
  dishes: Dish[] | null;
  tags: ItemTag[];
  phase: "loading" | "ready" | "error";
  listRequested: boolean;
  onRequest: () => void;
  onRequestList: () => void;
  onRetry: () => void;
  onTagsChanged: () => Promise<void>;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const { t } = useLingui();
  const [tagFilter, setTagFilter] = useState("all");
  const activeTagFilter = resolveTagFilter(tags, tagFilter);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [addFormRequested, setAddFormRequested] = useState(false);
  const query = search.trim().toLocaleLowerCase();
  const matches = dishes?.filter(
    (dish) =>
      dish.name.toLocaleLowerCase().includes(query) &&
      matchesTag(dish, activeTagFilter),
  );
  return (
    <div className="flex flex-col gap-3">
      <Collapsible
        open={adding}
        onOpenChange={(open) => {
          setAdding(open);
          // 首次展开才挂载表单，随后收起时保留未保存的输入。
          if (open) {
            setAddFormRequested(true);
            onRequest();
          }
        }}
        className={settingsCardCls}
      >
        <CollapsibleTrigger className={collapsibleFlushTriggerCls}>
          <Plus className="size-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground flex-1">
            <Trans>添加常用项目</Trans>
          </span>
          <Companion mood="chef" className="block size-8 shrink-0" />
          <ChevronDown className={collapsibleChevronCls} aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent forceMount className={collapsibleContentCls}>
          <div className="min-h-0 overflow-clip">
            {addFormRequested ? (
              categoryId ? (
                <div className="p-3 border-t bg-muted/30 border-border/60">
                  <p className={dishHintCls}>
                    <Trans>
                      热量按每单位填写：摄入填正数，消耗填负数，可留空
                    </Trans>
                  </p>
                  <DishRow
                    key="new"
                    tags={tags}
                    onTagsChanged={onTagsChanged}
                    categoryId={categoryId}
                    onSaved={onSaved}
                    onError={onError}
                  />
                </div>
              ) : (
                <MenuLoadStatus phase={phase} onRetry={onRetry} />
              )
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible
        className={settingsCardCls}
        onOpenChange={(open) => {
          if (open) onRequestList();
        }}
      >
        <CollapsibleTrigger className={collapsibleFlushTriggerCls}>
          <Bookmark
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground flex-1">
            <Trans>我的常用</Trans>
          </span>
          <span className="text-xs font-normal text-muted-foreground group-data-[state=open]/collapsible-trigger:hidden">
            <Trans>展开查看全部项目</Trans>
          </span>
          <ChevronDown className={collapsibleChevronCls} aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent forceMount className={collapsibleContentCls}>
          <div className="min-h-0 overflow-clip">
            {listRequested ? (
              dishes ? (
                <>
                  <div
                    ref={headerRef}
                    className="sticky top-0 z-10 bg-background py-3 flex flex-col gap-2 px-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {dishes.length > 0 ? (
                        <div className="min-w-0 flex-1">
                          <SearchInput
                            value={search}
                            onChange={setSearch}
                            label={t`搜索已有项目…`}
                          />
                        </div>
                      ) : null}
                      <ItemTagFilter
                        tags={tags}
                        value={activeTagFilter}
                        onChange={setTagFilter}
                      />
                    </div>
                  </div>
                  {dishes.length > 0 && matches?.length === 0 ? (
                    <p
                      className="py-6 text-center text-sm text-muted-foreground"
                      role="status"
                    >
                      <Trans>没有匹配的项目，请换个关键词</Trans>
                    </p>
                  ) : null}
                  {dishes.length === 0 ? (
                    <div className="flex min-h-36 flex-col items-center justify-center rounded-xl bg-card px-5 text-center">
                      <Companion
                        mood="dance"
                        className="block size-32 shrink-0"
                      />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        <Trans>还没有项目</Trans>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <Trans>早餐、咖啡、跑步，从常记的开始。</Trans>
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col rounded-xl bg-card overflow-hidden ring-1 ring-inset ring-border/60">
                      {dishes.map((dish) => (
                        <div
                          key={dish.id}
                          className={
                            dish.name.toLocaleLowerCase().includes(query) &&
                            matchesTag(dish, activeTagFilter)
                              ? "border-b border-border/60 last:border-b-0"
                              : "hidden"
                          }
                        >
                          <DishRow
                            dish={dish}
                            tags={tags}
                            onTagsChanged={onTagsChanged}
                            categoryId={dish.categoryId}
                            onSaved={onSaved}
                            onError={onError}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <MenuLoadStatus phase={phase} onRetry={onRetry} />
              )
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
