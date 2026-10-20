"use client";

import {
  Alert,
  AlertDescription,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@landing-page/design-system";
import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronDown, Plus } from "lucide-react";
import { useRef, useState } from "react";
import type { ItemTag } from "@/lib/bbq/types";
import { useMenuData } from "../../_hooks/use-menu-data";
import { cls, pageTitleCls } from "../../_styles/bbq-layout";
import { dishHintCls, menuColorsCls } from "../../_styles/dish-form-styles";
import { BbqCompanion } from "../companion/bbq-companion";
import { ItemEditViewport } from "../shared/item-edit-viewport";
import { DishList } from "./dish-list";
import { DishRow } from "./dish-row";
import { MenuLoadStatus } from "./menu-load-status";

export function MenuEditor({
  variant = "page",
  sharedTags,
  onTagsChanged,
  open,
  onOpenChange,
}: {
  variant?: "page" | "inline";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sharedTags?: ItemTag[];
  onTagsChanged?: (tags: ItemTag[]) => void;
}) {
  const { t } = useLingui();
  const {
    menu,
    tags,
    dishes,
    phase,
    message,
    notice,
    listRequested,
    setMessage,
    setLoadRequest,
    setListRequested,
    reloadTags,
    handleSaved,
  } = useMenuData(onTagsChanged);
  const [localOpen, setLocalOpen] = useState(false);
  const [inlineFormRequested, setInlineFormRequested] = useState(false);
  const listHeaderRef = useRef<HTMLDivElement>(null);

  const adding = open ?? localOpen;
  function changeAdding(next: boolean) {
    setLocalOpen(next);
    onOpenChange?.(next);
    if (next) {
      setInlineFormRequested(true);
      setLoadRequest((request) => request || 1);
    }
  }

  if (variant === "inline") {
    return (
      <Collapsible
        open={adding}
        onOpenChange={changeAdding}
        className={cls`shrink-0 ${menuColorsCls}`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.stopPropagation();
            changeAdding(false);
          }
        }}
      >
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="relative z-30 h-14 w-full justify-start gap-2 rounded-xl border border-border/60 bg-card/85 px-3 py-2 text-sm shadow-none backdrop-blur-xl hover:bg-card/90 hover:shadow-none"
          >
            <Plus className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-left">
              <Trans>添加常用项目</Trans>
            </span>
            {adding ? (
              <span className="text-xs font-normal text-muted-foreground">
                <Trans>收起</Trans>
              </span>
            ) : (
              <BbqCompanion mood="chef" className="block size-8 shrink-0" />
            )}
            <ChevronDown
              className={cls`size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${adding ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>
        <button
          type="button"
          className={cls`absolute inset-0 z-20 bg-background/40 backdrop-blur-xs transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${adding ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"}`}
          tabIndex={-1}
          inert={!adding}
          aria-hidden={!adding || undefined}
          aria-label={t`收起`}
          onClick={() => changeAdding(false)}
        />
        {/* 定位到记账内容区，始终只为入口占位；表单收起后保留输入。 */}
        <CollapsibleContent
          forceMount
          inert={!adding}
          aria-hidden={!adding || undefined}
          className="absolute inset-x-0 top-16 bottom-2 z-30 pointer-events-none overflow-clip"
        >
          <div
            className={cls`max-h-full overflow-y-auto overscroll-y-contain rounded-xl border border-border/60 bg-card/85 p-3 shadow-lg backdrop-blur-xl transition-[translate,visibility] duration-200 ease-out motion-reduce:transition-none ${adding ? "visible translate-y-0 pointer-events-auto" : "invisible -translate-y-full pointer-events-none"}`}
          >
            {notice && !message ? (
              <p className="mb-3 text-sm text-primary" role="status">
                {notice}
              </p>
            ) : null}
            {message ? (
              <Alert className="mb-3 border-destructive/30 bg-destructive/5 p-3">
                <AlertDescription className="text-destructive">
                  {message}
                </AlertDescription>
              </Alert>
            ) : null}
            {inlineFormRequested ? (
              <div className="relative">
                {/* 首次加载也保留完整表单尺寸，避免短提示突然撑成整张表单。 */}
                <fieldset disabled={!menu} aria-busy={!menu}>
                  <p className={dishHintCls}>
                    <Trans>
                      热量按每单位填写：摄入填正数，消耗填负数，可留空
                    </Trans>
                  </p>
                  <DishRow
                    tags={sharedTags ?? tags}
                    onTagsChanged={reloadTags}
                    categoryId={menu?.id ?? ""}
                    onSaved={handleSaved}
                    onError={setMessage}
                  />
                </fieldset>
                {!menu ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm">
                    <MenuLoadStatus
                      phase={phase}
                      onRetry={() => setLoadRequest((request) => request + 1)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  const listedCount = dishes?.filter((dish) => dish.listed).length ?? "—";

  return (
    <div
      className={cls`mx-auto flex w-full flex-col gap-2 min-h-0 flex-1 overflow-hidden ${menuColorsCls}`}
    >
      <header className="flex gap-2 flex-row items-start justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className={pageTitleCls}>
              <Trans>常用项目</Trans>
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Trans>常记的放这里 · {listedCount} 项可选</Trans>
          </p>
        </div>
      </header>
      {notice && !message ? (
        <p
          className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {message ? (
        <Alert className="border-destructive/30 bg-destructive/5 p-3">
          <AlertDescription className="text-destructive">
            {message}
          </AlertDescription>
        </Alert>
      ) : null}
      <ItemEditViewport
        headerRef={listHeaderRef}
        className="flex-1"
        scrollClassName="min-h-0 h-full overflow-y-auto overscroll-y-contain pb-3"
      >
        <DishList
          headerRef={listHeaderRef}
          categoryId={menu?.id ?? null}
          dishes={dishes}
          tags={sharedTags ?? tags}
          phase={phase}
          listRequested={listRequested}
          onRequest={() => setLoadRequest((request) => request || 1)}
          onRequestList={() => {
            setListRequested(true);
            setLoadRequest((request) => request || 1);
          }}
          onRetry={() => setLoadRequest((request) => request + 1)}
          onTagsChanged={reloadTags}
          onSaved={handleSaved}
          onError={setMessage}
        />
      </ItemEditViewport>
    </div>
  );
}
